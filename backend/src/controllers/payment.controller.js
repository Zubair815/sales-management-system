const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

const generateReceiptNumber = () => `RCP-${Date.now()}-${Math.floor(Math.random()*1000)}`;

const getPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status, salespersonId, partyId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { deletedAt: null };
    
    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;
    else if (salespersonId) where.salespersonId = salespersonId;
    
   if (search) {
      where.OR = [
        { receiptNumber: { contains: search } },
        { transactionId: { contains: search } },
        { purpose: { contains: search } },
        // Add relation searches
        { salesperson: { name: { contains: search } } },
        { salesperson: { employeeId: { contains: search } } },
        { party: { name: { contains: search } } }
      ];
    }
    
    if (status) where.status = status;
    if (partyId) where.partyId = partyId;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where, skip, take: parseInt(limit),
        include: {
          salesperson: { select: { name: true, employeeId: true } },
          party: { select: { name: true, phone: true } },
          order: { select: { orderNumber: true } },
          verifiedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);
    return paginatedResponse(res, payments, total, page, limit);
  } catch (e) { 
    console.error('PAYMENT FETCH ERROR:', e);
    return errorResponse(res, 'Failed to fetch payments', 500); 
  }
};

const getPayment = async (req, res) => {
  try {
    const where = { id: req.params.id, deletedAt: null };
    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;
    const payment = await prisma.payment.findFirst({
      where,
      include: { salesperson: true, party: true, order: true, verifiedBy: { select: { name: true } } },
    });
    if (!payment) return errorResponse(res, 'Payment not found', 404);
    return successResponse(res, payment);
  } catch (e) { return errorResponse(res, 'Failed to fetch payment', 500); }
};

const createPayment = async (req, res) => {
  try {
    const { partyId, orderId, amount, paymentMode, transactionId, paymentDate, purpose } = req.body;
    if (!partyId || !amount || !paymentMode || !paymentDate) return errorResponse(res, 'Required fields missing', 400);

    const salespersonId = req.user.role === 'Salesperson' ? req.user.id : req.body.salespersonId;
    if (!salespersonId) return errorResponse(res, 'Salesperson required', 400);

    const proofFilePath = req.file ? `/uploads/payments/${req.file.filename}` : null;
    const receiptNumber = generateReceiptNumber();

    const payment = await prisma.payment.create({
      data: { receiptNumber, salespersonId, partyId, orderId: orderId || null, amount: parseFloat(amount), paymentMode, transactionId, paymentDate: new Date(paymentDate), purpose, proofFilePath },
      include: { party: { select: { name: true } }, order: { select: { orderNumber: true } } },
    });

    const io = req.app.get('io');
    if (io) io.to('admin').emit('new_payment', { paymentId: payment.id, amount, salespersonId });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'CREATE_PAYMENT', module: 'PaymentManagement', recordId: payment.id, newValues: { amount, paymentMode }, ipAddress: req.ip });
    return successResponse(res, payment, 'Payment recorded', 201);
  } catch (e) { return errorResponse(res, 'Failed to record payment', 500); }
};

const deletePayment = async (req, res) => {
  try {
    await prisma.payment.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return successResponse(res, null, 'Payment deleted');
  } catch (e) { return errorResponse(res, 'Failed to delete payment', 500); }
};

const verifyPayment = async (req, res) => {
  try {
    const payment = await prisma.payment.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!payment) return errorResponse(res, 'Payment not found', 404);
    if (payment.status !== 'Pending') return errorResponse(res, 'Only pending payments can be verified', 400);

    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status: 'Verified', verifiedById: req.user.id, verifiedAt: new Date() },
    });

    const io = req.app.get('io');
    if (io) io.to(`salesperson_${payment.salespersonId}`).emit('payment_verified', { paymentId: payment.id, receiptNumber: payment.receiptNumber });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'VERIFY_PAYMENT', module: 'PaymentManagement', recordId: payment.id, ipAddress: req.ip });
    return successResponse(res, updated, 'Payment verified');
  } catch (e) { return errorResponse(res, 'Failed to verify payment', 500); }
};

const rejectPayment = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return errorResponse(res, 'Rejection reason required', 400);
    const payment = await prisma.payment.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!payment) return errorResponse(res, 'Payment not found', 404);
    if (payment.status !== 'Pending') return errorResponse(res, 'Only pending payments can be rejected', 400);

    const updated = await prisma.payment.update({ where: { id: req.params.id }, data: { status: 'Rejected', verifiedById: req.user.id, verifiedAt: new Date(), rejectionReason } });

    const io = req.app.get('io');
    if (io) io.to(`salesperson_${payment.salespersonId}`).emit('payment_rejected', { paymentId: payment.id, reason: rejectionReason });

    return successResponse(res, updated, 'Payment rejected');
  } catch (e) { return errorResponse(res, 'Failed to reject payment', 500); }
};

module.exports = { getPayments, getPayment, createPayment, deletePayment, verifyPayment, rejectPayment };
