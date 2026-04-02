const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
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
      const totalPaid = o.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
      const balance = parseFloat(o.grandTotal) - totalPaid;
      return {
        orderId: o.id, orderNumber: o.orderNumber, date: o.createdAt,
        party: o.party.name, salesperson: o.salesperson.name,
        orderAmount: parseFloat(o.grandTotal), paymentReceived: totalPaid,
        balanceDue: balance, isOverdue: balance > 0 && new Date() > new Date(o.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      };
    });

    const summary = {
      totalOrders: report.length,
      totalAmount: report.reduce((s, r) => s + r.orderAmount, 0),
      totalPayments: report.reduce((s, r) => s + r.paymentReceived, 0),
      outstandingAmount: report.reduce((s, r) => s + r.balanceDue, 0),
    };

    return successResponse(res, { report, summary });
  } catch (e) { return errorResponse(res, 'Failed to generate report', 500); }
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
      byType[e.expenseType.name].total += parseFloat(e.amount);
      byType[e.expenseType.name][e.status.toLowerCase()] += parseFloat(e.amount);
    });

    const summary = {
      totalExpenses: expenses.reduce((s, e) => s + parseFloat(e.amount), 0),
      approved: expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + parseFloat(e.amount), 0),
      rejected: expenses.filter(e => e.status === 'Rejected').reduce((s, e) => s + parseFloat(e.amount), 0),
      pending: expenses.filter(e => e.status === 'Pending').reduce((s, e) => s + parseFloat(e.amount), 0),
      byType,
    };

    return successResponse(res, { expenses, summary });
  } catch (e) { return errorResponse(res, 'Failed to generate report', 500); }
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
      totalCollected: payments.filter(p => p.status === 'Verified').reduce((s, p) => s + parseFloat(p.amount), 0),
      pendingVerification: payments.filter(p => p.status === 'Pending').reduce((s, p) => s + parseFloat(p.amount), 0),
      rejected: payments.filter(p => p.status === 'Rejected').reduce((s, p) => s + parseFloat(p.amount), 0),
      totalPayments: payments.length,
    };

    return successResponse(res, { payments, summary });
  } catch (e) { return errorResponse(res, 'Failed to generate report', 500); }
};

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

    const report = await Promise.all(salespersons.map(async (sp) => {
      const orderWhere = { salespersonId: sp.id, deletedAt: null, status: { not: 'Cancelled' } };
      const expWhere = { salespersonId: sp.id, deletedAt: null, status: 'Approved' };
      const payWhere = { salespersonId: sp.id, deletedAt: null, status: 'Verified' };
      if (dateFilter) { orderWhere.createdAt = dateFilter; expWhere.expenseDate = dateFilter; payWhere.paymentDate = dateFilter; }

      const [orders, expenses, payments] = await Promise.all([
        prisma.order.aggregate({ where: orderWhere, _sum: { grandTotal: true }, _count: true, _avg: { grandTotal: true } }),
        prisma.expense.aggregate({ where: expWhere, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: payWhere, _sum: { amount: true } }),
      ]);

      const revenue = parseFloat(orders._sum.grandTotal || 0);
      const expenseAmount = parseFloat(expenses._sum.amount || 0);
      const collected = parseFloat(payments._sum.amount || 0);

      return {
        salesperson: sp.name, employeeId: sp.employeeId, region: sp.region,
        totalOrders: orders._count, totalRevenue: revenue,
        avgOrderValue: parseFloat(orders._avg.grandTotal || 0),
        totalExpenses: expenseAmount,
        expenseToRevenueRatio: revenue > 0 ? ((expenseAmount / revenue) * 100).toFixed(2) : '0.00',
        totalCollected: collected,
        collectionEfficiency: revenue > 0 ? ((collected / revenue) * 100).toFixed(2) : '0.00',
        targetAmount: sp.targetAmount ? parseFloat(sp.targetAmount) : null,
        targetAchievement: sp.targetAmount && revenue > 0 ? ((revenue / parseFloat(sp.targetAmount)) * 100).toFixed(2) : null,
      };
    }));

    report.sort((a, b) => b.totalRevenue - a.totalRevenue);
    return successResponse(res, { report });
  } catch (e) { return errorResponse(res, 'Failed to generate report', 500); }
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
      costPrice: item.costPrice ? parseFloat(item.costPrice) : null,
      sellingPrice: parseFloat(item.sellingPrice),
      totalValueAtCost: item.costPrice ? item.stockQuantity * parseFloat(item.costPrice) : null,
      totalValueAtSelling: item.stockQuantity * parseFloat(item.sellingPrice),
      isLowStock: item.stockQuantity <= item.lowStockThreshold,
      status: item.status,
    }));

    const summary = {
      totalItems: report.length,
      totalValueAtSelling: report.reduce((s, i) => s + i.totalValueAtSelling, 0),
      lowStockItems: report.filter(i => i.isLowStock).length,
      outOfStock: report.filter(i => i.stockQuantity === 0).length,
    };

    return successResponse(res, { report, summary });
  } catch (e) { return errorResponse(res, 'Failed to generate report', 500); }
};

const exportOrderPaymentReport = async (req, res) => {
  try {
    const { format = 'excel', ...filters } = req.query;
    const fakeRes = { json: (data) => data };
    // Get report data
    const where = { deletedAt: null, status: { not: 'Cancelled' } };
    const orders = await prisma.order.findMany({
      where,
      include: { salesperson: { select: { name: true } }, party: { select: { name: true } }, payments: { where: { status: 'Verified' } } },
    });

    if (format === 'csv') {
      const rows = [['Order Number', 'Date', 'Party', 'Salesperson', 'Order Amount', 'Payment Received', 'Balance Due']];
      orders.forEach(o => {
        const paid = o.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
        rows.push([o.orderNumber, o.createdAt.toISOString().split('T')[0], o.party.name, o.salesperson.name, o.grandTotal, paid.toFixed(2), (parseFloat(o.grandTotal) - paid).toFixed(2)]);
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
      const paid = o.payments.reduce((s, p) => s + parseFloat(p.amount), 0);
      sheet.addRow([o.orderNumber, o.createdAt.toISOString().split('T')[0], o.party.name, o.salesperson.name, parseFloat(o.grandTotal), paid, parseFloat(o.grandTotal) - paid]);
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=order-payment-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { return errorResponse(res, 'Export failed', 500); }
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
    payments.forEach(p => sheet.addRow([p.receiptNumber, p.paymentDate.toISOString().split('T')[0], p.party.name, p.salesperson.name, parseFloat(p.amount), p.paymentMode, p.status]));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=payment-collection-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { return errorResponse(res, 'Export failed', 500); }
};

const exportSalespersonReport = async (req, res) => {
  try {
    const salespersons = await prisma.salesperson.findMany({ where: { deletedAt: null }, select: { id: true, name: true, employeeId: true, region: true } });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Salesperson Performance');
    sheet.addRow(['Name', 'Employee ID', 'Region', 'Total Orders', 'Total Revenue', 'Avg Order Value', 'Total Expenses', 'Total Collected']);
    sheet.getRow(1).font = { bold: true };
    for (const sp of salespersons) {
      const [orders, expenses, payments] = await Promise.all([
        prisma.order.aggregate({ where: { salespersonId: sp.id, deletedAt: null }, _sum: { grandTotal: true }, _count: true, _avg: { grandTotal: true } }),
        prisma.expense.aggregate({ where: { salespersonId: sp.id, status: 'Approved', deletedAt: null }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { salespersonId: sp.id, status: 'Verified', deletedAt: null }, _sum: { amount: true } }),
      ]);
      sheet.addRow([sp.name, sp.employeeId, sp.region || '', orders._count, parseFloat(orders._sum.grandTotal || 0), parseFloat(orders._avg.grandTotal || 0), parseFloat(expenses._sum.amount || 0), parseFloat(payments._sum.amount || 0)]);
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=salesperson-report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) { return errorResponse(res, 'Export failed', 500); }
};

module.exports = { orderPaymentReport, expenseBudgetReport, paymentCollectionReport, salespersonPerformanceReport, inventoryValuationReport, exportOrderPaymentReport, exportPaymentCollectionReport, exportSalespersonReport };
