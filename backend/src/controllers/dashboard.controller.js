const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { getCache, setCache } = require('../utils/cache');

// Date helpers moved inside functions to avoid stale module-level values

const getAdminDashboard = async (req, res) => {
  try {
    const cacheKey = 'admin_dashboard';
    const cachedData = getCache(cacheKey);
    if (cachedData) return successResponse(res, cachedData);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const [
      totalOrdersMTD, totalOrdersYTD,
      revenueMTD, revenueYTD,
      expensesMTD, expensesYTD,
      collectionsMTD, collectionsYTD,
      pendingOrders, pendingExpenses, pendingPayments,
      orderTrend, expensesByType, lowStockItems,
      topSalespersons,
    ] = await Promise.all([
      prisma.order.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth }, status: { not: 'Cancelled' } } }),
      prisma.order.count({ where: { deletedAt: null, createdAt: { gte: startOfYear }, status: { not: 'Cancelled' } } }),
      prisma.order.aggregate({ where: { deletedAt: null, createdAt: { gte: startOfMonth }, status: { not: 'Cancelled' } }, _sum: { grandTotal: true } }),
      prisma.order.aggregate({ where: { deletedAt: null, createdAt: { gte: startOfYear }, status: { not: 'Cancelled' } }, _sum: { grandTotal: true } }),
      prisma.expense.aggregate({ where: { deletedAt: null, expenseDate: { gte: startOfMonth }, status: 'Approved' }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { deletedAt: null, expenseDate: { gte: startOfYear }, status: 'Approved' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: startOfMonth }, status: 'Verified' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: startOfYear }, status: 'Verified' }, _sum: { amount: true } }),
      prisma.order.count({ where: { deletedAt: null, status: 'Pending' } }),
      prisma.expense.count({ where: { deletedAt: null, status: 'Pending' } }),
      prisma.payment.count({ where: { deletedAt: null, status: 'Pending' } }),
      // Last 7 days order trend
      prisma.$queryRaw`SELECT DATE(created_at) as date, COUNT(*) as count, SUM(grand_total) as revenue FROM orders WHERE deleted_at IS NULL AND created_at >= NOW() - INTERVAL 7 DAY GROUP BY DATE(created_at) ORDER BY date`,
      // Expenses by type
      prisma.expense.groupBy({ by: ['expenseTypeId'], where: { deletedAt: null, status: 'Approved', expenseDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      // Low stock
      prisma.inventoryItem.findMany({ where: { deletedAt: null, status: 'Active' }, take: 100 }),
      // Top salespersons
      prisma.$queryRaw`SELECT s.name, s.employee_id as "employeeId", SUM(o.grand_total) as revenue FROM salespersons s JOIN orders o ON o.salesperson_id = s.id WHERE o.deleted_at IS NULL AND o.status != 'Cancelled' AND o.created_at >= ${startOfMonth} GROUP BY s.id, s.name, s.employee_id ORDER BY revenue DESC LIMIT 5`,
    ]);

    const lowStock = lowStockItems.filter(i => i.stockQuantity <= i.lowStockThreshold);

    const responseData = {
      orders: { mtd: totalOrdersMTD, ytd: totalOrdersYTD },
      revenue: { mtd: parseFloat(revenueMTD._sum.grandTotal || 0), ytd: parseFloat(revenueYTD._sum.grandTotal || 0) },
      expenses: { mtd: parseFloat(expensesMTD._sum.amount || 0), ytd: parseFloat(expensesYTD._sum.amount || 0) },
      collections: { mtd: parseFloat(collectionsMTD._sum.amount || 0), ytd: parseFloat(collectionsYTD._sum.amount || 0) },
      profitMargin: { mtd: parseFloat(revenueMTD._sum.grandTotal || 0) - parseFloat(expensesMTD._sum.amount || 0) },
      pendingApprovals: { orders: pendingOrders, expenses: pendingExpenses, payments: pendingPayments },
      orderTrend, expensesByType, lowStockAlerts: lowStock.slice(0, 10),
      topSalespersons: topSalespersons.map(s => ({ ...s, revenue: parseFloat(s.revenue || 0) })),
    };

    setCache(cacheKey, responseData, 300); // cache for 5 mins
    return successResponse(res, responseData);
  } catch (e) { return errorResponse(res, 'Failed to load dashboard', 500); }
};

const getSalespersonDashboard = async (req, res) => {
  try {
    const spId = req.user.id;
    const cacheKey = `sp_dashboard_${spId}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) return successResponse(res, cachedData);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [ordersMTD, expensesMTD, paymentsMTD, recentOrders, unreadAnnouncements, pendingExpenses, pendingPayments] = await Promise.all([
      prisma.order.aggregate({ where: { salespersonId: spId, deletedAt: null, createdAt: { gte: startOfMonth }, status: { not: 'Cancelled' } }, _sum: { grandTotal: true }, _count: true }),
      prisma.expense.aggregate({ where: { salespersonId: spId, deletedAt: null, expenseDate: { gte: startOfMonth } }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { salespersonId: spId, deletedAt: null, paymentDate: { gte: startOfMonth }, status: 'Verified' }, _sum: { amount: true } }),
      prisma.order.findMany({ where: { salespersonId: spId, deletedAt: null }, include: { party: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.announcement.count({
        where: { deletedAt: null, status: 'Sent', recipients: { some: { salespersonId: spId } }, reads: { none: { salespersonId: spId } } },
      }),
      prisma.expense.count({ where: { salespersonId: spId, deletedAt: null, status: 'Pending' } }),
      prisma.payment.count({ where: { salespersonId: spId, deletedAt: null, status: 'Pending' } }),
    ]);

    const responseData = {
      ordersMTD: { count: ordersMTD._count, revenue: parseFloat(ordersMTD._sum.grandTotal || 0) },
      expensesMTD: { count: expensesMTD._count, amount: parseFloat(expensesMTD._sum.amount || 0) },
      collectionsMTD: parseFloat(paymentsMTD._sum.amount || 0),
      recentOrders, unreadAnnouncements, pendingExpenses, pendingPayments,
    };

    setCache(cacheKey, responseData, 300);
    return successResponse(res, responseData);
  } catch (e) { return errorResponse(res, 'Failed to load dashboard', 500); }
};

const getSuperAdminDashboard = async (req, res) => {
  try {
    const cacheKey = 'super_admin_dashboard';
    const cachedData = getCache(cacheKey);
    if (cachedData) return successResponse(res, cachedData);

    const [totalAdmins, totalSalespersons, totalOrders, totalRevenue, recentAuditLogs] = await Promise.all([
      prisma.admin.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.salesperson.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.aggregate({ where: { deletedAt: null, status: { not: 'Cancelled' } }, _sum: { grandTotal: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    
    const responseData = { totalAdmins, totalSalespersons, totalOrders, totalRevenue: parseFloat(totalRevenue._sum.grandTotal || 0), recentAuditLogs };
    setCache(cacheKey, responseData, 300);
    return successResponse(res, responseData);
  } catch (e) { return errorResponse(res, 'Failed to load dashboard', 500); }
};

module.exports = { getAdminDashboard, getSalespersonDashboard, getSuperAdminDashboard };
