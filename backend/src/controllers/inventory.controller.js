const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

const getItems = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { deletedAt: null };
    if (status) where.status = status;
    else if (req.user.role === 'Salesperson') where.status = 'Active';
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (search) where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
    ];

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({ where, skip, take: parseInt(limit), orderBy: { name: 'asc' } }),
      prisma.inventoryItem.count({ where }),
    ]);
    return paginatedResponse(res, items, total, page, limit);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch items', 500);
  }
};

const getItem = async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!item) return errorResponse(res, 'Item not found', 404);
    return successResponse(res, item);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch item', 500);
  }
};

const createItem = async (req, res) => {
  try {
    const { sku, name, description, category, unit, costPrice, sellingPrice, stockQuantity, lowStockThreshold } = req.body;
    if (!sku || !name || !sellingPrice) return errorResponse(res, 'SKU, name, and selling price are required', 400);

    const existing = await prisma.inventoryItem.findFirst({ where: { sku, deletedAt: null } });
    if (existing) return errorResponse(res, 'SKU already exists', 400);

    const item = await prisma.inventoryItem.create({
      data: { sku, name, description, category, unit: unit || 'Piece', costPrice: costPrice ? parseFloat(costPrice) : null, sellingPrice: parseFloat(sellingPrice), stockQuantity: parseInt(stockQuantity) || 0, lowStockThreshold: parseInt(lowStockThreshold) || 10 },
    });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'CREATE_INVENTORY_ITEM', module: 'InventoryManagement', recordId: item.id, newValues: { sku, name }, ipAddress: req.ip });
    return successResponse(res, item, 'Item created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create item', 500);
  }
};

const updateItem = async (req, res) => {
  try {
    const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return errorResponse(res, 'Item not found', 404);
    const { name, description, category, unit, costPrice, sellingPrice, lowStockThreshold, status } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(description !== undefined && { description }), ...(category !== undefined && { category }), ...(unit && { unit }), ...(costPrice !== undefined && { costPrice: parseFloat(costPrice) }), ...(sellingPrice && { sellingPrice: parseFloat(sellingPrice) }), ...(lowStockThreshold && { lowStockThreshold: parseInt(lowStockThreshold) }), ...(status && { status }) },
    });
    return successResponse(res, item, 'Item updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update item', 500);
  }
};

const deleteItem = async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!item) return errorResponse(res, 'Item not found', 404);
    await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return successResponse(res, null, 'Item deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete item', 500);
  }
};

const adjustStock = async (req, res) => {
  try {
    const { adjustment, reason } = req.body;
    if (!adjustment) return errorResponse(res, 'Adjustment value required', 400);
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!item) return errorResponse(res, 'Item not found', 404);
    const newStock = item.stockQuantity + parseInt(adjustment);
    if (newStock < 0) return errorResponse(res, 'Insufficient stock', 400);
    const updated = await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { stockQuantity: newStock } });

    // Emit low stock alert if needed
    if (newStock <= updated.lowStockThreshold) {
      const io = req.app.get('io');
      if (io) io.emit('low_stock_alert', { itemId: item.id, sku: item.sku, name: item.name, stock: newStock, threshold: item.lowStockThreshold });
    }

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'ADJUST_STOCK', module: 'InventoryManagement', recordId: item.id, oldValues: { stock: item.stockQuantity }, newValues: { stock: newStock, adjustment, reason }, ipAddress: req.ip });
    return successResponse(res, updated, 'Stock adjusted');
  } catch (error) {
    return errorResponse(res, 'Failed to adjust stock', 500);
  }
};

const getLowStockItems = async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { deletedAt: null, status: 'Active', stockQuantity: { lte: prisma.inventoryItem.fields.lowStockThreshold } },
    });
    // Fallback raw query approach
    const lowStock = await prisma.$queryRaw`SELECT * FROM inventory_items WHERE deleted_at IS NULL AND status = 'Active' AND stock_quantity <= low_stock_threshold`;
    return successResponse(res, lowStock);
  } catch (error) {
    // Fallback
    try {
      const items = await prisma.inventoryItem.findMany({ where: { deletedAt: null, status: 'Active' } });
      const lowStock = items.filter(i => i.stockQuantity <= i.lowStockThreshold);
      return successResponse(res, lowStock);
    } catch (e) {
      return errorResponse(res, 'Failed to fetch low stock items', 500);
    }
  }
};

module.exports = { getItems, getItem, createItem, updateItem, deleteItem, adjustStock, getLowStockItems };
