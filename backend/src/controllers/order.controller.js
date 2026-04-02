const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

const generateOrderNumber = () => {
  const date = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `ORD-${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${Math.floor(Math.random()*9000)+1000}`;
};

const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status, salespersonId, partyId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { deletedAt: null };

    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;
    else if (salespersonId) where.salespersonId = salespersonId;

    if (status) where.status = status;
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
    return errorResponse(res, 'Failed to fetch order', 500);
  }
};

const createOrder = async (req, res) => {
  try {
    const { partyId, items, notes, taxAmount } = req.body;
    if (!partyId || !items?.length) return errorResponse(res, 'Party and items required', 400);

    const salespersonId = req.user.role === 'Salesperson' ? req.user.id : req.body.salespersonId;
    if (!salespersonId) return errorResponse(res, 'Salesperson required', 400);

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];
    for (const item of items) {
      const invItem = await prisma.inventoryItem.findFirst({ where: { id: item.itemId, deletedAt: null, status: 'Active' } });
      if (!invItem) return errorResponse(res, `Item ${item.itemId} not found`, 400);
      if (invItem.stockQuantity < item.quantity) return errorResponse(res, `Insufficient stock for ${invItem.name}`, 400);
      const unitPrice = item.unitPrice || parseFloat(invItem.sellingPrice);
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;
      orderItems.push({ itemId: item.itemId, quantity: parseInt(item.quantity), unitPrice, totalPrice });
    }

    const tax = taxAmount ? parseFloat(taxAmount) : 0;
    const grandTotal = totalAmount + tax;
    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber, salespersonId, partyId, totalAmount, taxAmount: tax, grandTotal, notes,
          orderItems: { create: orderItems },
        },
        include: { orderItems: true, party: true, salesperson: { select: { name: true, employeeId: true } } },
      });
      return newOrder;
    });

    const io = req.app.get('io');
    if (io) io.to(`admin`).emit('new_order', { orderId: order.id, orderNumber, salesperson: order.salesperson.name });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'CREATE_ORDER', module: 'OrderManagement', recordId: order.id, newValues: { orderNumber, grandTotal }, ipAddress: req.ip });
    return successResponse(res, order, 'Order created', 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Failed to create order', 500);
  }
};

const updateOrder = async (req, res) => {
  try {
    const where = { id: req.params.id, deletedAt: null };
    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;
    const existing = await prisma.order.findFirst({ where });
    if (!existing) return errorResponse(res, 'Order not found', 404);
    if (existing.status !== 'Pending') return errorResponse(res, 'Only pending orders can be edited', 400);

    const { notes } = req.body;
    const order = await prisma.order.update({ where: { id: req.params.id }, data: { ...(notes !== undefined && { notes }) } });
    return successResponse(res, order, 'Order updated');
  } catch (error) {
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
  catch (e) { return errorResponse(res, 'Failed to approve order', 500); }
};

const dispatchOrder = async (req, res) => {
  try { return await changeOrderStatus(req, res, 'Dispatched', ['Approved']); }
  catch (e) { return errorResponse(res, 'Failed to dispatch order', 500); }
};

const deliverOrder = async (req, res) => {
  try { return await changeOrderStatus(req, res, 'Delivered', ['Dispatched']); }
  catch (e) { return errorResponse(res, 'Failed to mark as delivered', 500); }
};

const cancelOrder = async (req, res) => {
  try {
    const allowedRoles = ['SuperAdmin', 'Admin'];
    const allowedStatuses = req.user.role === 'Salesperson' ? ['Pending'] : ['Pending', 'Approved'];
    return await changeOrderStatus(req, res, 'Cancelled', allowedStatuses);
  } catch (e) { return errorResponse(res, 'Failed to cancel order', 500); }
};

const deleteOrder = async (req, res) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!order) return errorResponse(res, 'Order not found', 404);
    await prisma.order.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return successResponse(res, null, 'Order deleted');
  } catch (error) {
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
    return errorResponse(res, 'Failed to get batch print data', 500);
  }
};

module.exports = { getOrders, getOrder, createOrder, updateOrder, deleteOrder, approveOrder, dispatchOrder, deliverOrder, cancelOrder, getPrintData, batchPrint };
