const crypto = require('crypto');
const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');
const { toMoney } = require('../utils/money');
const logger = require('../utils/logger');

// Collision-safe order number using crypto
const generateOrderNumber = () => {
  const date = new Date();
  const pad = n => String(n).padStart(2, '0');
  const uid = crypto.randomUUID().split('-')[0].toUpperCase(); // 8 hex chars
  return `ORD-${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${uid}`;
};

const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status, salespersonId, partyId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { deletedAt: null };

    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;
    else if (salespersonId) where.salespersonId = salespersonId;

    if (status) {
      where.status = status;
    } else if (req.user.role !== 'Salesperson') {
      // Hide draft (Prepared) orders from admin unless explicitly filtered
      where.status = { not: 'Prepared' };
    }
    if (partyId) where.partyId = partyId;
    if (search) where.orderNumber = { contains: search};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        include: {
          salesperson: { select: { name: true, employeeId: true, region: true } },
          party: { select: { name: true, phone: true } },
          orderItems: { include: { item: { select: { name: true, sku: true, unit: true } } } },
          _count: { select: { payments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    return paginatedResponse(res, orders, total, page, limit);
  } catch (error) {
    logger.error('Failed to fetch orders:', error);
    return errorResponse(res, 'Failed to fetch orders', 500);
  }
};

const getOrder = async (req, res) => {
  try {
    const where = { id: req.params.id, deletedAt: null };
    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;

    const order = await prisma.order.findFirst({
      where,
      include: {
        salesperson: { select: { name: true, employeeId: true, region: true, phone: true } },
        party: true,
        orderItems: { include: { item: true } },
        payments: true,
      },
    });
    if (!order) return errorResponse(res, 'Order not found', 404);
    return successResponse(res, order);
  } catch (error) {
    logger.error('Failed to fetch order:', error);
    return errorResponse(res, 'Failed to fetch order', 500);
  }
};

/**
 * CREATE ORDER — with transactional stock reservation.
 * 
 * CRITICAL FIX: Stock is now validated AND decremented inside 
 * the Prisma transaction. This prevents:
 *   - Overselling (two concurrent orders passing the same stock check)
 *   - Phantom reads (stock changing between check and decrement)
 *   - Partial failures (order created but stock not decremented)
 * 
 * Race condition prevention:
 *   Prisma's interactive transactions use database-level row locks
 *   on UPDATE. Two concurrent transactions updating the same 
 *   inventory row will serialize — the second waits for the first.
 *   If stock goes negative, we throw inside the tx to roll back.
 */
const createOrder = async (req, res) => {
  try {
    const { partyId, items, notes, taxAmount } = req.body;
    if (!partyId || !items?.length) return errorResponse(res, 'Party and items required', 400);

    const salespersonId = req.user.role === 'Salesperson' ? req.user.id : req.body.salespersonId;
    if (!salespersonId) return errorResponse(res, 'Salesperson required', 400);

    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      // 1. Fetch inventory items INSIDE the transaction for consistency
      const itemIds = items.map(i => i.itemId);
      const invItems = await tx.inventoryItem.findMany({
        where: { id: { in: itemIds }, deletedAt: null, status: 'Active' }
      });

      const invItemsMap = new Map(invItems.map(i => [i.id, i]));

      // 2. Validate and build order items with safe money math
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const invItem = invItemsMap.get(item.itemId);
        if (!invItem) {
          throw new Error(`Item ${item.itemId} not found or inactive`);
        }
        if (invItem.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for "${invItem.name}". Available: ${invItem.stockQuantity}, Requested: ${item.quantity}`);
        }

        const unitPrice = toMoney(item.unitPrice || invItem.sellingPrice);
        const totalPrice = toMoney(unitPrice * item.quantity);
        totalAmount += totalPrice;

        orderItems.push({
          itemId: item.itemId,
          quantity: parseInt(item.quantity),
          unitPrice,
          totalPrice
        });
      }

      totalAmount = toMoney(totalAmount);
      const tax = toMoney(taxAmount || 0);
      const grandTotal = toMoney(totalAmount + tax);

      // 3. Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber, salespersonId, partyId,
          totalAmount, taxAmount: tax, grandTotal, notes,
          status: 'Prepared',
          orderItems: { create: orderItems },
        },
        include: {
          orderItems: true,
          party: true,
          salesperson: { select: { name: true, employeeId: true } }
        },
      });

      // 4. Decrement stock for each item ATOMICALLY inside the transaction
      for (const item of orderItems) {
        const updated = await tx.inventoryItem.update({
          where: { id: item.itemId },
          data: { stockQuantity: { decrement: item.quantity } }
        });

        // Safety net: if stock went negative due to a race, roll back everything
        if (updated.stockQuantity < 0) {
          throw new Error(`Stock race condition detected for item "${updated.name}". Order rolled back.`);
        }
      }

      return newOrder;
    }, {
      // Transaction options: timeout after 10s to prevent long locks
      timeout: 10000,
    });

    // Emit low stock alerts after transaction succeeds (non-blocking)
    try {
      const io = req.app.get('io');
      if (io) {
        for (const item of order.orderItems) {
          const current = await prisma.inventoryItem.findUnique({ where: { id: item.itemId } });
          if (current && current.stockQuantity <= current.lowStockThreshold) {
            io.emit('low_stock_alert', {
              itemId: current.id, sku: current.sku,
              name: current.name, stock: current.stockQuantity,
              threshold: current.lowStockThreshold
            });
          }
        }
      }
    } catch (alertErr) {
      logger.warn('Failed to emit low stock alerts:', alertErr.message);
    }

    await createAuditLog({
      userId: req.user.id, userType: req.user.role,
      action: 'PREPARE_ORDER', module: 'OrderManagement',
      recordId: order.id,
      newValues: { orderNumber, grandTotal: order.grandTotal },
      ipAddress: req.ip
    });

    return successResponse(res, order, 'Order prepared and saved to drafts', 201);
  } catch (error) {
    // Return user-friendly messages for known validation errors
    if (error.message.includes('Insufficient stock') ||
        error.message.includes('not found') ||
        error.message.includes('race condition')) {
      return errorResponse(res, error.message, 400);
    }
    logger.error('Failed to create order:', error);
    return errorResponse(res, 'Failed to create order', 500);
  }
};

// --- Submit Order to Admin ---
const submitOrder = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { salesperson: { select: { name: true } } }
    });

    if (!order) return errorResponse(res, 'Order not found', 404);
    
    // Security check
    if (req.user.role === 'Salesperson' && order.salespersonId !== req.user.id) {
      return errorResponse(res, 'Unauthorized to submit this order', 403);
    }

    // Status lock check
    if (order.status !== 'Prepared') {
      return errorResponse(res, `Only Prepared orders can be submitted. Current status: ${order.status}`, 400);
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: 'Pending' }
    });

    // NOW we notify the Admin that a new order is ready for review
    const io = req.app.get('io');
    if (io) io.to(`admin`).emit('new_order', { orderId: order.id, orderNumber: order.orderNumber, salesperson: order.salesperson.name });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'SUBMIT_ORDER', module: 'OrderManagement', recordId: order.id, newValues: { status: 'Pending' }, ipAddress: req.ip });
    
    return successResponse(res, updated, 'Order submitted to Admin successfully');
  } catch (error) {
    logger.error('Failed to submit order:', error);
    return errorResponse(res, 'Failed to submit order', 500);
  }
};

const updateOrder = async (req, res) => {
  try {
    const where = { id: req.params.id, deletedAt: null };
    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;
    const existing = await prisma.order.findFirst({ where });
    
    if (!existing) return errorResponse(res, 'Order not found', 404);
    
    // Allow editing only if Prepared (or Pending if you want them to fix typos before Admin approval)
    if (!['Prepared', 'Pending'].includes(existing.status)) {
      return errorResponse(res, 'Locked: Cannot edit approved or dispatched orders', 400);
    }

    const { notes } = req.body;
    const order = await prisma.order.update({ 
      where: { id: req.params.id }, 
      data: { ...(notes !== undefined && { notes }) } 
    });
    
    return successResponse(res, order, 'Order updated');
  } catch (error) {
    logger.error('Failed to update order:', error);
    return errorResponse(res, 'Failed to update order', 500);
  }
};

const changeOrderStatus = async (req, res, newStatus, allowedStatuses) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!order) return errorResponse(res, 'Order not found', 404);
  if (!allowedStatuses.includes(order.status)) return errorResponse(res, `Cannot change from ${order.status} to ${newStatus}`, 400);

  const updated = await prisma.order.update({ where: { id: req.params.id }, data: { status: newStatus } });

  const io = req.app.get('io');
  if (io) io.to(`salesperson_${order.salespersonId}`).emit('order_status_update', { orderId: order.id, orderNumber: order.orderNumber, status: newStatus });

  await createAuditLog({ userId: req.user.id, userType: req.user.role, action: `ORDER_${newStatus.toUpperCase()}`, module: 'OrderManagement', recordId: order.id, oldValues: { status: order.status }, newValues: { status: newStatus }, ipAddress: req.ip });
  return successResponse(res, updated, `Order ${newStatus}`);
};

const approveOrder = async (req, res) => {
  try { return await changeOrderStatus(req, res, 'Approved', ['Pending']); }
  catch (e) { logger.error('Failed to approve order:', e); return errorResponse(res, 'Failed to approve order', 500); }
};

const dispatchOrder = async (req, res) => {
  try { return await changeOrderStatus(req, res, 'Dispatched', ['Approved']); }
  catch (e) { logger.error('Failed to dispatch order:', e); return errorResponse(res, 'Failed to dispatch order', 500); }
};

const deliverOrder = async (req, res) => {
  try { return await changeOrderStatus(req, res, 'Delivered', ['Dispatched']); }
  catch (e) { logger.error('Failed to mark as delivered:', e); return errorResponse(res, 'Failed to mark as delivered', 500); }
};

/**
 * CANCEL ORDER — with transactional stock restoration.
 * 
 * CRITICAL FIX: When an order is cancelled, the reserved stock 
 * must be returned to inventory. This happens atomically inside
 * a transaction to prevent inconsistency.
 */
const cancelOrder = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { orderItems: true }
    });
    if (!order) return errorResponse(res, 'Order not found', 404);

    // Security: Salesperson can only cancel their own orders
    if (req.user.role === 'Salesperson' && order.salespersonId !== req.user.id) {
      return errorResponse(res, 'Unauthorized: You can only cancel your own orders', 403);
    }

    const allowedStatuses = req.user.role === 'Salesperson' ? ['Prepared', 'Pending'] : ['Prepared', 'Pending', 'Approved'];
    if (!allowedStatuses.includes(order.status)) {
      return errorResponse(res, `Cannot cancel order with status: ${order.status}`, 400);
    }

    // Cancel order AND restore stock atomically
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: req.params.id }, data: { status: 'Cancelled' } });

      // Restore stock for each order item
      for (const item of order.orderItems) {
        await tx.inventoryItem.update({
          where: { id: item.itemId },
          data: { stockQuantity: { increment: item.quantity } }
        });
      }
    });

    const io = req.app.get('io');
    if (io) io.to(`salesperson_${order.salespersonId}`).emit('order_status_update', { orderId: order.id, orderNumber: order.orderNumber, status: 'Cancelled' });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'ORDER_CANCELLED', module: 'OrderManagement', recordId: order.id, oldValues: { status: order.status }, newValues: { status: 'Cancelled' }, ipAddress: req.ip });
    return successResponse(res, null, 'Order Cancelled — stock restored');
  } catch (e) { 
    logger.error('Failed to cancel order:', e);
    return errorResponse(res, 'Failed to cancel order', 500); 
  }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!order) return errorResponse(res, 'Order not found', 404);
    await prisma.order.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    
    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'DELETE_ORDER', module: 'OrderManagement', recordId: order.id, ipAddress: req.ip });
    return successResponse(res, null, 'Order deleted');
  } catch (error) {
    logger.error('Failed to delete order:', error);
    return errorResponse(res, 'Failed to delete order', 500);
  }
};

const getPrintData = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        salesperson: { select: { name: true, employeeId: true, region: true, phone: true } },
        party: true,
        orderItems: { include: { item: { select: { name: true, sku: true, unit: true } } } },
      },
    });
    if (!order) return errorResponse(res, 'Order not found', 404);

    // Track print count
    await prisma.order.update({ where: { id: order.id }, data: { printedCount: order.printedCount + 1, lastPrintedAt: new Date() } });

    const template = await prisma.printTemplate.findFirst({ where: { name: 'order' } });
    return successResponse(res, { order, template });
  } catch (error) {
    logger.error('Failed to get print data:', error);
    return errorResponse(res, 'Failed to get print data', 500);
  }
};

const batchPrint = async (req, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds?.length) return errorResponse(res, 'Order IDs required', 400);

    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds }, deletedAt: null },
      include: {
        salesperson: { select: { name: true, employeeId: true, region: true } },
        party: true,
        orderItems: { include: { item: { select: { name: true, sku: true, unit: true } } } },
      },
    });

    await prisma.order.updateMany({ where: { id: { in: orderIds } }, data: { printedCount: { increment: 1 }, lastPrintedAt: new Date() } });

    const template = await prisma.printTemplate.findFirst({ where: { name: 'order' } });
    return successResponse(res, { orders, template });
  } catch (error) {
    logger.error('Failed to get batch print data:', error);
    return errorResponse(res, 'Failed to get batch print data', 500);
  }
};

module.exports = { 
  getOrders, 
  getOrder, 
  createOrder, 
  submitOrder,
  updateOrder, 
  deleteOrder, 
  approveOrder, 
  dispatchOrder, 
  deliverOrder, 
  cancelOrder, 
  getPrintData, 
  batchPrint 
};