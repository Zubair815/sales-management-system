const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { getCache, setCache } = require('../utils/cache');
const { toMoney } = require('../utils/money');
const logger = require('../utils/logger');

// Date helpers moved inside functions to avoid stale module-level values

const getAdminDashboard = async (req, res) => {
  try {
    const cacheKey = 'admin_dashboard';
    const cachedData = getCache(cacheKey);
    if (cachedData) return successResponse(res, cachedData);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Use Promise.allSettled for resilient dashboard loading.
    // If one query fails (e.g., raw SQL on a cold DB), the dashboard still loads.
    const results = await Promise.allSettled([
      prisma.order.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth }, status: { notIn: ['Cancelled', 'Prepared'] } } }),
      prisma.order.count({ where: { deletedAt: null, createdAt: { gte: startOfYear }, status: { notIn: ['Cancelled', 'Prepared'] } } }),
      prisma.order.aggregate({ where: { deletedAt: null, createdAt: { gte: startOfMonth }, status: { notIn: ['Cancelled', 'Prepared'] } }, _sum: { grandTotal: true } }),
      prisma.order.aggregate({ where: { deletedAt: null, createdAt: { gte: startOfYear }, status: { notIn: ['Cancelled', 'Prepared'] } }, _sum: { grandTotal: true } }),
      prisma.expense.aggregate({ where: { deletedAt: null, expenseDate: { gte: startOfMonth }, status: 'Approved' }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { deletedAt: null, expenseDate: { gte: startOfYear }, status: 'Approved' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: startOfMonth }, status: 'Verified' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { deletedAt: null, paymentDate: { gte: startOfYear }, status: 'Verified' }, _sum: { amount: true } }),
      prisma.order.count({ where: { deletedAt: null, status: 'Pending' } }),
      prisma.expense.count({ where: { deletedAt: null, status: 'Pending' } }),
      prisma.payment.count({ where: { deletedAt: null, status: 'Pending' } }),
      // Last 7 days order trend
      prisma.$queryRaw`SELECT DATE(created_at) as date, COUNT(*) as count, SUM(grand_total) as revenue FROM orders WHERE deleted_at IS NULL AND status NOT IN ('Cancelled', 'Prepared') AND created_at >= NOW() - INTERVAL 7 DAY GROUP BY DATE(created_at) ORDER BY date`,
      // Expenses by type
      prisma.expense.groupBy({ by: ['expenseTypeId'], where: { deletedAt: null, status: 'Approved', expenseDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      // Low stock
      prisma.inventoryItem.findMany({ where: { deletedAt: null, status: 'Active' }, take: 100 }),
      // Top salespersons
      prisma.$queryRaw`SELECT s.name, s.employee_id as "employeeId", SUM(o.grand_total) as revenue FROM salespersons s JOIN orders o ON o.salesperson_id = s.id WHERE o.deleted_at IS NULL AND o.status NOT IN ('Cancelled', 'Prepared') AND o.created_at >= ${startOfMonth} GROUP BY s.id, s.name, s.employee_id ORDER BY revenue DESC LIMIT 5`,
    ]);

    // Safe extraction — returns fallback if the query failed
    const get = (idx, fallback = 0) => results[idx].status === 'fulfilled' ? results[idx].value : fallback;

    const totalOrdersMTD = get(0, 0);
    const totalOrdersYTD = get(1, 0);
    const revenueMTD = get(2, { _sum: { grandTotal: null } });
    const revenueYTD = get(3, { _sum: { grandTotal: null } });
    const expensesMTD = get(4, { _sum: { amount: null } });
    const expensesYTD = get(5, { _sum: { amount: null } });
    const collectionsMTD = get(6, { _sum: { amount: null } });
    const collectionsYTD = get(7, { _sum: { amount: null } });
    const pendingOrders = get(8, 0);
    const pendingExpenses = get(9, 0);
    const pendingPayments = get(10, 0);
    const orderTrend = get(11, []);
    const expensesByType = get(12, []);
    const lowStockItems = get(13, []);
    const topSalespersons = get(14, []);

    // Log any failed queries for debugging (but don't crash the dashboard)
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        logger.warn(`Admin dashboard query ${i} failed:`, r.reason?.message);
      }
    });

    const lowStock = lowStockItems.filter(i => i.stockQuantity <= i.lowStockThreshold);

    const revMTD = toMoney(revenueMTD._sum.grandTotal);
    const expMTD = toMoney(expensesMTD._sum.amount);

    const responseData = {
      orders: { mtd: totalOrdersMTD, ytd: totalOrdersYTD },
      revenue: { mtd: revMTD, ytd: toMoney(revenueYTD._sum.grandTotal) },
      expenses: { mtd: expMTD, ytd: toMoney(expensesYTD._sum.amount) },
      collections: { mtd: toMoney(collectionsMTD._sum.amount), ytd: toMoney(collectionsYTD._sum.amount) },
      profitMargin: { mtd: toMoney(revMTD - expMTD) },
      pendingApprovals: { orders: pendingOrders, expenses: pendingExpenses, payments: pendingPayments },
      orderTrend, expensesByType, lowStockAlerts: lowStock.slice(0, 10),
      topSalespersons: topSalespersons.map(s => ({ ...s, revenue: toMoney(s.revenue) })),
    };

    setCache(cacheKey, responseData, 300); // cache for 5 mins
    return successResponse(res, responseData);
  } catch (e) { 
    logger.error('Failed to load admin dashboard:', e);
    return errorResponse(res, 'Failed to load dashboard', 500); 
  }
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
      ordersMTD: { count: ordersMTD._count, revenue: toMoney(ordersMTD._sum.grandTotal) },
      expensesMTD: { count: expensesMTD._count, amount: toMoney(expensesMTD._sum.amount) },
      collectionsMTD: toMoney(paymentsMTD._sum.amount),
      recentOrders, unreadAnnouncements, pendingExpenses, pendingPayments,
    };

    setCache(cacheKey, responseData, 300);
    return successResponse(res, responseData);
  } catch (e) { 
    logger.error('Failed to load salesperson dashboard:', e);
    return errorResponse(res, 'Failed to load dashboard', 500); 
  }
};

const getSuperAdminDashboard = async (req, res) => {
  try {
    const cacheKey = 'super_admin_dashboard';
    const cachedData = getCache(cacheKey);
    if (cachedData) return successResponse(res, cachedData);

    const [totalAdmins, totalSalespersons, totalOrders, totalRevenue, recentAuditLogs] = await Promise.all([
      prisma.admin.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.salesperson.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.order.count({ where: { deletedAt: null, status: { notIn: ['Cancelled', 'Prepared'] } } }),
      prisma.order.aggregate({ where: { deletedAt: null, status: { notIn: ['Cancelled', 'Prepared'] } }, _sum: { grandTotal: true } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    
    const responseData = { totalAdmins, totalSalespersons, totalOrders, totalRevenue: toMoney(totalRevenue._sum.grandTotal), recentAuditLogs };
    setCache(cacheKey, responseData, 300);
    return successResponse(res, responseData);
  } catch (e) { 
    logger.error('Failed to load super admin dashboard:', e);
    return errorResponse(res, 'Failed to load dashboard', 500); 
  }
};

module.exports = { getAdminDashboard, getSalespersonDashboard, getSuperAdminDashboard };
