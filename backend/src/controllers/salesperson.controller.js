const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

const SALT = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

const getSalespersons = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status, region } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { deletedAt: null };
   if (search) where.OR = [
      { name: { contains: search } },
      { employeeId: { contains: search } },
      { phone: { contains: search } },
    ];
    if (status) where.status = status;
    if (region) where.region = { contains: region, mode: 'insensitive' };

    const [salespersons, total] = await Promise.all([
      prisma.salesperson.findMany({
        where, skip, take: parseInt(limit),
        select: { id: true, employeeId: true, name: true, email: true, phone: true, region: true, jobRole: true, status: true, targetAmount: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesperson.count({ where }),
    ]);
    return paginatedResponse(res, salespersons, total, page, limit);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch salespersons', 500);
  }
};

const getSalesperson = async (req, res) => {
  try {
    const sp = await prisma.salesperson.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true, employeeId: true, name: true, email: true, phone: true, region: true, jobRole: true, status: true, targetAmount: true, budgetAmount: true, lastLoginAt: true, createdAt: true },
    });
    if (!sp) return errorResponse(res, 'Salesperson not found', 404);
    return successResponse(res, sp);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch salesperson', 500);
  }
};

const createSalesperson = async (req, res) => {
  try {
    const { employeeId, name, email, phone, password, region, jobRole, targetAmount, budgetAmount } = req.body;

    const existing = await prisma.salesperson.findFirst({ where: { employeeId, deletedAt: null } });
    if (existing) return errorResponse(res, 'Employee ID already exists', 400);

    if (email) {
      const emailExists = await prisma.salesperson.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
      if (emailExists) return errorResponse(res, 'Email already in use', 400);
    }

    const hashed = await bcrypt.hash(password, SALT);
    const sp = await prisma.salesperson.create({
      data: { employeeId, name, email: email?.toLowerCase(), phone, password: hashed, region, jobRole, targetAmount: targetAmount ? parseFloat(targetAmount) : null, budgetAmount: budgetAmount ? parseFloat(budgetAmount) : null },
    });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'CREATE_SALESPERSON', module: 'SalespersonManagement', recordId: sp.id, newValues: { employeeId, name }, ipAddress: req.ip });

    const { password: _, ...spData } = sp;
    return successResponse(res, spData, 'Salesperson created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create salesperson', 500);
  }
};

const updateSalesperson = async (req, res) => {
  try {
    const { name, email, phone, region, jobRole, targetAmount, budgetAmount } = req.body;
    const existing = await prisma.salesperson.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return errorResponse(res, 'Salesperson not found', 404);

    if (email && email !== existing.email) {
      const emailTaken = await prisma.salesperson.findFirst({ where: { email: email.toLowerCase(), deletedAt: null, id: { not: req.params.id } } });
      if (emailTaken) return errorResponse(res, 'Email already in use', 400);
    }

    const sp = await prisma.salesperson.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(email && { email: email.toLowerCase() }), ...(phone && { phone }), ...(region !== undefined && { region }), ...(jobRole !== undefined && { jobRole }), ...(targetAmount !== undefined && { targetAmount: parseFloat(targetAmount) }), ...(budgetAmount !== undefined && { budgetAmount: parseFloat(budgetAmount) }) },
    });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'UPDATE_SALESPERSON', module: 'SalespersonManagement', recordId: sp.id, ipAddress: req.ip });

    const { password, ...spData } = sp;
    return successResponse(res, spData, 'Salesperson updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update salesperson', 500);
  }
};

const deleteSalesperson = async (req, res) => {
  try {
    const spId = req.params.id;
    const sp = await prisma.salesperson.findFirst({ where: { id: spId, deletedAt: null } });
    if (!sp) return errorResponse(res, 'Salesperson not found', 404);

    // --- NEW SECURITY RULES ---

    // RULE 1: Prevent Deletion if Active
    if (sp.status === 'Active') {
      return errorResponse(res, 'Cannot delete an active salesperson. Please deactivate them first.', 400);
    }

    // RULE 2: Prevent Deletion if they have Pending transactions
    // We shouldn't delete a salesperson if they have open business with the company
    const pendingOrders = await prisma.order.count({ 
      where: { salespersonId: spId, status: 'Pending', deletedAt: null } 
    });
    const pendingExpenses = await prisma.expense.count({ 
      where: { salespersonId: spId, status: 'Pending', deletedAt: null } 
    });
    const pendingPayments = await prisma.payment.count({ 
      where: { salespersonId: spId, status: 'Pending', deletedAt: null } 
    });

    if (pendingOrders > 0 || pendingExpenses > 0 || pendingPayments > 0) {
      return errorResponse(res, 'Cannot delete salesperson. They have pending orders, expenses, or payments that must be resolved first.', 400);
    }

    // --- END SECURITY RULES ---

    // Proceed with soft delete
    await prisma.salesperson.update({ where: { id: spId }, data: { deletedAt: new Date() } });
    
    await createAuditLog({ 
      userId: req.user.id, userType: req.user.role, 
      action: 'DELETE_SALESPERSON', module: 'SalespersonManagement', 
      recordId: spId, ipAddress: req.ip 
    });
    
    return successResponse(res, null, 'Salesperson safely deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete salesperson', 500);
  }
};

const toggleStatus = async (req, res) => {
  try {
    const sp = await prisma.salesperson.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!sp) return errorResponse(res, 'Salesperson not found', 404);
    const newStatus = sp.status === 'Active' ? 'Inactive' : 'Active';
    await prisma.salesperson.update({ where: { id: req.params.id }, data: { status: newStatus } });
    return successResponse(res, { status: newStatus }, `Salesperson ${newStatus}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update status', 500);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || !/^[a-zA-Z0-9]{8,12}$/.test(password)) return errorResponse(res, 'Password must be 8-12 alphanumeric chars', 400);
    const sp = await prisma.salesperson.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!sp) return errorResponse(res, 'Salesperson not found', 404);
    const hashed = await bcrypt.hash(password, SALT);
    await prisma.salesperson.update({ where: { id: req.params.id }, data: { password: hashed, failedAttempts: 0, lockedUntil: null } });
    return successResponse(res, null, 'Password reset');
  } catch (error) {
    return errorResponse(res, 'Failed to reset password', 500);
  }
};

module.exports = { getSalespersons, getSalesperson, createSalesperson, updateSalesperson, deleteSalesperson, toggleStatus, resetPassword };
