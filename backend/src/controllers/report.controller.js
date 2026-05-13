const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { toMoney, sumMoney } = require('../utils/money');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');

const buildDateFilter = (startDate, endDate) => {
  const filter = {};
  if (startDate) filter.gte = new Date(startDate);
  if (endDate) filter.lte = new Date(endDate + 'T23:59:59');
  return Object.keys(filter).length ? filter : undefined;
};

const orderPaymentReport = async (req, res) => {
  try {
    const { startDate, endDate, salespersonId, partyId } = req.query;
    const where = { deletedAt: null, status: { not: 'Cancelled' } };
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) where.createdAt = dateFilter;
    if (salespersonId) where.salespersonId = salespersonId;
    if (partyId) where.partyId = partyId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        salesperson: { select: { name: true, employeeId: true } },
        party: { select: { name: true } },
        payments: { where: { status: 'Verified', deletedAt: null } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const report = orders.map(o => {
      const totalPaid = sumMoney(o.payments, p => p.amount);
      const orderAmount = toMoney(o.grandTotal);
      const balance = toMoney(orderAmount - totalPaid);
      return {
        orderId: o.id, orderNumber: o.orderNumber, date: o.createdAt,
        party: o.party.name, salesperson: o.salesperson.name,
        orderAmount, paymentReceived: totalPaid,
        balanceDue: balance, isOverdue: balance > 0 && new Date() > new Date(o.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      };
    });

    const summary = {
      totalOrders: report.length,
      totalAmount: sumMoney(report, r => r.orderAmount),
      totalPayments: sumMoney(report, r => r.paymentReceived),
      outstandingAmount: sumMoney(report, r => r.balanceDue),
    };

    return successResponse(res, { report, summary });
  } catch (e) { 
    logger.error('Failed to generate order payment report:', e);
    return errorResponse(res, 'Failed to generate report', 500); 
  }
};

const expenseBudgetReport = async (req, res) => {
  try {
    const { startDate, endDate, salespersonId, expenseTypeId } = req.query;
    const where = { deletedAt: null };
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) where.expenseDate = dateFilter;
    if (salespersonId) where.salespersonId = salespersonId;
    if (expenseTypeId) where.expenseTypeId = expenseTypeId;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        salesperson: { select: { name: true, employeeId: true, budgetAmount: true } },
        expenseType: { select: { name: true } },
      },
      orderBy: { expenseDate: 'desc' },
    });

    const byType = {};
    expenses.forEach(e => {
      if (!byType[e.expenseType.name]) byType[e.expenseType.name] = { total: 0, approved: 0, rejected: 0, pending: 0 };
      byType[e.expenseType.name].total = toMoney(byType[e.expenseType.name].total + toMoney(e.amount));
      const statusKey = e.status.toLowerCase();
      if (byType[e.expenseType.name][statusKey] !== undefined) {
        byType[e.expenseType.name][statusKey] = toMoney(byType[e.expenseType.name][statusKey] + toMoney(e.amount));
      }
    });

    const summary = {
      totalExpenses: sumMoney(expenses, e => e.amount),
      approved: sumMoney(expenses.filter(e => e.status === 'Approved'), e => e.amount),
      rejected: sumMoney(expenses.filter(e => e.status === 'Rejected'), e => e.amount),
      pending: sumMoney(expenses.filter(e => e.status === 'Pending'), e => e.amount),
      byType,
    };

    return successResponse(res, { expenses, summary });
  } catch (e) { 
    logger.error('Failed to generate expense budget report:', e);
    return errorResponse(res, 'Failed to generate report', 500); 
  }
};

const paymentCollectionReport = async (req, res) => {
  try {
    const { startDate, endDate, salespersonId, partyId, status } = req.query;
    const where = { deletedAt: null };
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) where.paymentDate = dateFilter;
    if (salespersonId) where.salespersonId = salespersonId;
    if (partyId) where.partyId = partyId;
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        salesperson: { select: { name: true, employeeId: true } },
        party: { select: { name: true } },
        order: { select: { orderNumber: true } },
        verifiedBy: { select: { name: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const summary = {
      totalCollected: sumMoney(payments.filter(p => p.status === 'Verified'), p => p.amount),
      pendingVerification: sumMoney(payments.filter(p => p.status === 'Pending'), p => p.amount),
      rejected: sumMoney(payments.filter(p => p.status === 'Rejected'), p => p.amount),
      totalPayments: payments.length,
    };

    return successResponse(res, { payments, summary });
  } catch (e) { 
    logger.error('Failed to generate payment collection report:', e);
    return errorResponse(res, 'Failed to generate report', 500); 
  }
};

/**
 * PERFORMANCE FIX: Replaced N+1 query pattern (1 query per salesperson × 3 aggregations)
 * with batched aggregation queries. For 100 salespersons, this reduces
 * 300 DB queries down to 3.
 */
const salespersonPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, salespersonId } = req.query;
    const dateFilter = buildDateFilter(startDate, endDate);

    const spWhere = { deletedAt: null, status: 'Active' };
    if (salespersonId) spWhere.id = salespersonId;

    const salespersons = await prisma.salesperson.findMany({
      where: spWhere,
      select: { id: true, name: true, employeeId: true, region: true, targetAmount: true },
    });

    if (!salespersons.length) return successResponse(res, { report: [] });

    const spIds = salespersons.map(s => s.id);

    // Batched aggregation queries instead of N+1
    const orderWhere = { salespersonId: { in: spIds }, deletedAt: null, status: { not: 'Cancelled' } };
    const expWhere = { salespersonId: { in: spIds }, deletedAt: null, status: 'Approved' };
    const payWhere = { salespersonId: { in: spIds }, deletedAt: null, status: 'Verified' };
    if (dateFilter) { orderWhere.createdAt = dateFilter; expWhere.expenseDate = dateFilter; payWhere.paymentDate = dateFilter; }

    const [orderGroups, expenseGroups, paymentGroups] = await Promise.all([
      prisma.order.groupBy({
        by: ['salespersonId'],
        where: orderWhere,
        _sum: { grandTotal: true },
        _count: true,
        _avg: { grandTotal: true },
      }),
      prisma.expense.groupBy({
        by: ['salespersonId'],
        where: expWhere,
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ['salespersonId'],
        where: payWhere,
        _sum: { amount: true },
      }),
    ]);

    // Build lookup maps
    const orderMap = new Map(orderGroups.map(g => [g.salespersonId, g]));
    const expenseMap = new Map(expenseGroups.map(g => [g.salespersonId, g]));
    const paymentMap = new Map(paymentGroups.map(g => [g.salespersonId, g]));

    const report = salespersons.map(sp => {
      const orders = orderMap.get(sp.id);
      const expenses = expenseMap.get(sp.id);
      const payments = paymentMap.get(sp.id);

      const revenue = toMoney(orders?._sum?.grandTotal);
      const expenseAmount = toMoney(expenses?._sum?.amount);
      const collected = toMoney(payments?._sum?.amount);
      const target = sp.targetAmount ? toMoney(sp.targetAmount) : null;

      return {
        salesperson: sp.name, employeeId: sp.employeeId, region: sp.region,
        totalOrders: orders?._count || 0,
        totalRevenue: revenue,
        avgOrderValue: toMoney(orders?._avg?.grandTotal),
        totalExpenses: expenseAmount,
        expenseToRevenueRatio: revenue > 0 ? ((expenseAmount / revenue) * 100).toFixed(2) : '0.00',
        totalCollected: collected,
        collectionEfficiency: revenue > 0 ? ((collected / revenue) * 100).toFixed(2) : '0.00',
        targetAmount: target,
        targetAchievement: target && revenue > 0 ? ((revenue / target) * 100).toFixed(2) : null,
      };
    });

    report.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return successResponse(res, { report });
  } catch (e) { 
    logger.error('Failed to generate salesperson performance report:', e);
    return errorResponse(res, 'Failed to generate report', 500); 
  }
};

const inventoryValuationReport = async (req, res) => {
  try {
    const { category, status } = req.query;
    const where = { deletedAt: null };
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (status) where.status = status;

    const items = await prisma.inventoryItem.findMany({ where, orderBy: { category: 'asc' } });

    const report = items.map(item => ({
      id: item.id, sku: item.sku, name: item.name, category: item.category || 'Uncategorized',
      unit: item.unit, stockQuantity: item.stockQuantity,
      costPrice: toMoney(item.costPrice),
      sellingPrice: toMoney(item.sellingPrice),
      totalValueAtCost: item.costPrice ? toMoney(item.stockQuantity * toMoney(item.costPrice)) : null,
      totalValueAtSelling: toMoney(item.stockQuantity * toMoney(item.sellingPrice)),
      isLowStock: item.stockQuantity <= item.lowStockThreshold,
      status: item.status,
    }));

    const summary = {
      totalItems: report.length,
      totalValueAtSelling: sumMoney(report, i => i.totalValueAtSelling),
      lowStockItems: report.filter(i => i.isLowStock).length,
      outOfStock: report.filter(i => i.stockQuantity === 0).length,
    };

    return successResponse(res, { report, summary });
  } catch (e) { 
    logger.error('Failed to generate inventory valuation report:', e);
    return errorResponse(res, 'Failed to generate report', 500); 
  }
};

const exportOrderPaymentReport = async (req, res) => {
  try {
    const { format = 'excel' } = req.query;
    const where = { deletedAt: null, status: { not: 'Cancelled' } };
    const orders = await prisma.order.findMany({
      where,
      include: { salesperson: { select: { name: true } }, party: { select: { name: true } }, payments: { where: { status: 'Verified' } } },
    });

    if (format === 'csv') {
      const rows = [['Order Number', 'Date', 'Party', 'Salesperson', 'Order Amount', 'Payment Received', 'Balance Due']];
      orders.forEach(o => {
        const paid = sumMoney(o.payments, p => p.amount);
        const orderAmt = toMoney(o.grandTotal);
        rows.push([o.orderNumber, o.createdAt.toISOString().split('T')[0], o.party.name, o.salesperson.name, orderAmt, paid.toFixed(2), toMoney(orderAmt - paid).toFixed(2)]);
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=order-payment-report.csv');
      return res.send(rows.map(r => r.join(',')).join('\n'));
    }

    // Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Order Payment Report');
    sheet.addRow(['Order Number', 'Date', 'Party', 'Salesperson', 'Order Amount', 'Payment Received', 'Balance Due']);
    sheet.getRow(1).font = { bold: true };
    orders.forEach(o => {
      const paid = sumMoney(o.payments, p => p.amount);
      const orderAmt = toMoney(o.grandTotal);
      sheet.addRow([o.orderNumber, o.createdAt.toISOString().split('T')[0], o.party.name, o.salesperson.name, orderAmt, paid, toMoney(orderAmt - paid)]);
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=order-payment-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { 
    logger.error('Export order payment report failed:', e);
    return errorResponse(res, 'Export failed', 500); 
  }
};

const exportPaymentCollectionReport = async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { deletedAt: null },
      include: { salesperson: { select: { name: true } }, party: { select: { name: true } } },
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Payment Collection');
    sheet.addRow(['Receipt No', 'Date', 'Party', 'Salesperson', 'Amount', 'Mode', 'Status']);
    sheet.getRow(1).font = { bold: true };
    payments.forEach(p => sheet.addRow([p.receiptNumber, p.paymentDate.toISOString().split('T')[0], p.party.name, p.salesperson.name, toMoney(p.amount), p.paymentMode, p.status]));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=payment-collection-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { 
    logger.error('Export payment collection report failed:', e);
    return errorResponse(res, 'Export failed', 500); 
  }
};

const exportSalespersonReport = async (req, res) => {
  try {
    const salespersons = await prisma.salesperson.findMany({ where: { deletedAt: null }, select: { id: true, name: true, employeeId: true, region: true } });
    
    const spIds = salespersons.map(s => s.id);
    const [orderGroups, expenseGroups, paymentGroups] = await Promise.all([
      prisma.order.groupBy({ by: ['salespersonId'], where: { salespersonId: { in: spIds }, deletedAt: null }, _sum: { grandTotal: true }, _count: true, _avg: { grandTotal: true } }),
      prisma.expense.groupBy({ by: ['salespersonId'], where: { salespersonId: { in: spIds }, status: 'Approved', deletedAt: null }, _sum: { amount: true } }),
      prisma.payment.groupBy({ by: ['salespersonId'], where: { salespersonId: { in: spIds }, status: 'Verified', deletedAt: null }, _sum: { amount: true } }),
    ]);

    const orderMap = new Map(orderGroups.map(g => [g.salespersonId, g]));
    const expenseMap = new Map(expenseGroups.map(g => [g.salespersonId, g]));
    const paymentMap = new Map(paymentGroups.map(g => [g.salespersonId, g]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Salesperson Performance');
    sheet.addRow(['Name', 'Employee ID', 'Region', 'Total Orders', 'Total Revenue', 'Avg Order Value', 'Total Expenses', 'Total Collected']);
    sheet.getRow(1).font = { bold: true };
    
    for (const sp of salespersons) {
      const orders = orderMap.get(sp.id);
      const expenses = expenseMap.get(sp.id);
      const payments = paymentMap.get(sp.id);
      sheet.addRow([sp.name, sp.employeeId, sp.region || '', orders?._count || 0, toMoney(orders?._sum?.grandTotal), toMoney(orders?._avg?.grandTotal), toMoney(expenses?._sum?.amount), toMoney(payments?._sum?.amount)]);
    }
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=salesperson-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { 
    logger.error('Export salesperson report failed:', e);
    return errorResponse(res, 'Export failed', 500); 
  }
};

module.exports = { orderPaymentReport, expenseBudgetReport, paymentCollectionReport, salespersonPerformanceReport, inventoryValuationReport, exportOrderPaymentReport, exportPaymentCollectionReport, exportSalespersonReport };
