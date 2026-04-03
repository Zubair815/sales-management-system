const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

// Expense Types
const getExpenseTypes = async (req, res) => {
  try {
    const where = { deletedAt: null };
    if (req.user.role === 'Salesperson') where.status = 'Active';
    const types = await prisma.expenseType.findMany({ where, orderBy: { name: 'asc' } });
    return successResponse(res, types);
  } catch (e) { return errorResponse(res, 'Failed to fetch expense types', 500); }
};

const createExpenseType = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return errorResponse(res, 'Name required', 400);
    const existing = await prisma.expenseType.findFirst({ where: { name, deletedAt: null } });
    if (existing) return errorResponse(res, 'Expense type already exists', 400);
    const type = await prisma.expenseType.create({ data: { name, description } });
    return successResponse(res, type, 'Expense type created', 201);
  } catch (e) { return errorResponse(res, 'Failed to create expense type', 500); }
};

const updateExpenseType = async (req, res) => {
  try {
    // ONLY extract the status.
    const { status } = req.body; 
    
    if (!['Active', 'Inactive'].includes(status)) {
      return errorResponse(res, 'Invalid status. Must be Active or Inactive.', 400);
    }

    const type = await prisma.expenseType.update({ 
      where: { id: req.params.id }, 
      data: { status } 
    });
    
    return successResponse(res, type, `Expense type marked as ${status}`);
  } catch (e) { 
    return errorResponse(res, 'Failed to update expense type', 500); 
  }
};

const deleteExpenseType = async (req, res) => {
  try {
    await prisma.expenseType.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return successResponse(res, null, 'Expense type deleted');
  } catch (e) { return errorResponse(res, 'Failed to delete expense type', 500); }
};

// Expenses
const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status, salespersonId, expenseTypeId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const where = { deletedAt: null };
    
    // --- NEW SECURITY LOGIC ---
    if (req.user.role === 'Salesperson') {
      // Salespersons only see their own expenses (including their own drafts)
      where.salespersonId = req.user.id;
      if (status) where.status = status;
    } else {
      // Admins/SuperAdmins can filter by a specific salesperson
      if (salespersonId) where.salespersonId = salespersonId;
      
      // Admins CANNOT see Drafts. If they apply a status filter, use it. 
      // Otherwise, show everything EXCEPT Drafts.
      if (status) {
        where.status = status; 
      } else {
        where.status = { not: 'Draft' }; 
      }
    }
    // --------------------------
    
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { budgetCode: { contains: search } },
        { remarks: { contains: search } },
        { salesperson: { name: { contains: search } } },
        { salesperson: { employeeId: { contains: search } } },
        { expenseType: { name: { contains: search } } }
      ];
    }
    
    if (expenseTypeId) where.expenseTypeId = expenseTypeId;
    
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where, skip, take: parseInt(limit),
        include: {
          salesperson: { select: { name: true, employeeId: true } },
          expenseType: { select: { name: true } },
          approvedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.expense.count({ where }),
    ]);
    return paginatedResponse(res, expenses, total, page, limit);
  } catch (e) { 
    console.error('EXPENSE FETCH ERROR:', e);
    return errorResponse(res, 'Failed to fetch expenses', 500); 
  }
};

// --- NEW FUNCTION: Group Expenses by Salesperson (Admin Dashboard View) ---
const getAdminExpenseReports = async (req, res) => {
  try {
    const { search = '' } = req.query;

    // 1. Find all salespeople who have expenses (excluding deleted ones)
    const salespeople = await prisma.salesperson.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search } },
            { employeeId: { contains: search } }
          ]
        })
      },
      include: {
        expenses: {
          where: { 
            deletedAt: null,
            status: { not: 'Draft' } // Admins never see drafts
          }
        }
      }
    });

    // 2. Map through them and calculate totals
    const reports = salespeople
      .map(sp => {
        const expenses = sp.expenses || [];
        if (expenses.length === 0) return null; // Skip SPs with no submitted expenses

        // Calculate counts
        const totalExpenses = expenses.length;
        const pendingCount = expenses.filter(e => e.status === 'Pending').length;

        // Calculate financial totals (converting Decimal to Number for safety)
        const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const pendingAmount = expenses
          .filter(e => e.status === 'Pending')
          .reduce((sum, e) => sum + Number(e.amount), 0);

        return {
          salespersonId: sp.id,
          name: sp.name,
          employeeId: sp.employeeId,
          region: sp.region,
          totalExpenses,
          pendingCount,
          totalAmount,
          pendingAmount,
          // We can determine an overall status based on if they have pending items
          status: pendingCount > 0 ? 'Pending Review' : 'Reviewed'
        };
      })
      .filter(report => report !== null) // Remove nulls
      .sort((a, b) => b.pendingCount - a.pendingCount); // Sort those needing review to the top

    return successResponse(res, reports, 'Admin expense reports generated');
  } catch (error) {
    console.error('ADMIN REPORT ERROR:', error);
    return errorResponse(res, 'Failed to fetch admin expense reports', 500);
  }
};

const getExpense = async (req, res) => {
  try {
    const where = { id: req.params.id, deletedAt: null };
    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;
    const expense = await prisma.expense.findFirst({
      where,
      include: { salesperson: true, expenseType: true, approvedBy: { select: { name: true } } },
    });
    if (!expense) return errorResponse(res, 'Expense not found', 404);
    return successResponse(res, expense);
  } catch (e) { return errorResponse(res, 'Failed to fetch expense', 500); }
};

// --- MODIFIED: Save as Draft ---
const createExpense = async (req, res) => {
  try {
    const { expenseTypeId, description, amount, expenseDate, budgetCode, remarks } = req.body;
    if (!expenseTypeId || !description || !amount || !expenseDate) return errorResponse(res, 'All required fields must be provided', 400);

    const salespersonId = req.user.role === 'Salesperson' ? req.user.id : req.body.salespersonId;
    if (!salespersonId) return errorResponse(res, 'Salesperson required', 400);

    const proofFilePath = req.file ? req.file.path : null;

    const expense = await prisma.expense.create({
      data: { 
        salespersonId, 
        expenseTypeId, 
        description, 
        amount: parseFloat(amount), 
        expenseDate: new Date(expenseDate), 
        proofFilePath, 
        budgetCode,
        remarks,
        status: 'Draft' // Forces Draft status upon creation
      },
      include: { expenseType: { select: { name: true } } },
    });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'CREATE_EXPENSE', module: 'ExpenseManagement', recordId: expense.id, newValues: { amount }, ipAddress: req.ip });
    return successResponse(res, expense, 'Expense saved as draft', 201);
  } catch (e) { 
    console.error('CREATE EXPENSE ERROR:', e);
    return errorResponse(res, 'Failed to save expense', 500); 
  }
};

// --- NEW FUNCTION: Submit Monthly Batch ---
const submitMonthlyExpenses = async (req, res) => {
  try {
    const salespersonId = req.user.id;

    // Check if there are any drafts
    const drafts = await prisma.expense.findMany({
      where: { salespersonId, status: 'Draft', deletedAt: null }
    });

    if (drafts.length === 0) {
      return errorResponse(res, 'No draft expenses found to submit', 400);
    }

    // Update to Pending and set timestamp
    await prisma.expense.updateMany({
      where: { salespersonId, status: 'Draft', deletedAt: null },
      data: { 
        status: 'Pending', 
        submittedAt: new Date() 
      }
    });

    // Notify Admin via Socket.io
    const io = req.app.get('io');
    if (io) io.to('admin').emit('monthly_expenses_submitted', { salespersonId, count: drafts.length });

    await createAuditLog({ userId: salespersonId, userType: 'Salesperson', action: 'SUBMIT_MONTHLY_EXPENSES', module: 'ExpenseManagement', ipAddress: req.ip });
    
    return successResponse(res, null, 'Monthly expenses submitted to Admin successfully');
  } catch (error) {
    console.error('SUBMIT BATCH ERROR:', error);
    return errorResponse(res, 'Failed to submit monthly expenses', 500);
  }
};

// --- MODIFIED: Allow updating Drafts ---
const updateExpense = async (req, res) => {
  try {
    const where = { id: req.params.id, deletedAt: null };
    if (req.user.role === 'Salesperson') where.salespersonId = req.user.id;
    const existing = await prisma.expense.findFirst({ where });
    if (!existing) return errorResponse(res, 'Expense not found', 404);
    
    // Only allow editing if it hasn't been submitted or approved
    if (existing.status !== 'Draft' && existing.status !== 'Pending') {
      return errorResponse(res, 'Only draft or pending expenses can be edited', 400);
    }

    const { description, amount, expenseDate } = req.body;
    const expense = await prisma.expense.update({ 
      where: { id: req.params.id }, 
      data: { 
        ...(description && { description }), 
        ...(amount && { amount: parseFloat(amount) }), 
        ...(expenseDate && { expenseDate: new Date(expenseDate) }) 
      } 
    });
    return successResponse(res, expense, 'Expense updated');
  } catch (e) { return errorResponse(res, 'Failed to update expense', 500); }
};

const deleteExpense = async (req, res) => {
  try {
    await prisma.expense.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return successResponse(res, null, 'Expense deleted');
  } catch (e) { return errorResponse(res, 'Failed to delete expense', 500); }
};

const approveExpense = async (req, res) => {
  try {
    const { remarks } = req.body;
    const expense = await prisma.expense.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!expense) return errorResponse(res, 'Expense not found', 404);
    if (expense.status !== 'Pending') return errorResponse(res, 'Only pending expenses can be approved', 400);

    const isSuperAdmin = req.user.role === 'SuperAdmin';

    const updated = await prisma.expense.update({
      where: { id: req.params.id },
      data: { 
        status: 'Approved', 
        approvedAt: new Date(), 
        remarks,
        ...(isSuperAdmin ? {} : { approvedById: req.user.id }) // Skips ID relation if SuperAdmin
      },
    });

    const io = req.app.get('io');
    if (io) io.to(`salesperson_${expense.salespersonId}`).emit('expense_approved', { expenseId: expense.id, status: 'Approved' });

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'APPROVE_EXPENSE', module: 'ExpenseManagement', recordId: expense.id, ipAddress: req.ip });
    return successResponse(res, updated, 'Expense approved');
  } catch (e) { 
    console.error('APPROVE ERROR:', e);
    return errorResponse(res, 'Failed to approve expense', 500); 
  }
};

const rejectExpense = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return errorResponse(res, 'Rejection reason required', 400);
    const expense = await prisma.expense.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!expense) return errorResponse(res, 'Expense not found', 404);
    if (expense.status !== 'Pending') return errorResponse(res, 'Only pending expenses can be rejected', 400);

    const isSuperAdmin = req.user.role === 'SuperAdmin';

    const updated = await prisma.expense.update({ 
      where: { id: req.params.id }, 
      data: { 
        status: 'Rejected', 
        approvedAt: new Date(), 
        rejectionReason,
        ...(isSuperAdmin ? {} : { approvedById: req.user.id }) // Skips ID relation if SuperAdmin
      } 
    });

    const io = req.app.get('io');
    if (io) io.to(`salesperson_${expense.salespersonId}`).emit('expense_rejected', { expenseId: expense.id, reason: rejectionReason });

    return successResponse(res, updated, 'Expense rejected');
  } catch (e) { 
    console.error('REJECT ERROR:', e);
    return errorResponse(res, 'Failed to reject expense', 500); 
  }
};

// --- NEW FUNCTION: Bulk Approve All Pending Expenses ---
const bulkApproveExpenses = async (req, res) => {
  try {
    const { salespersonId } = req.body;
    
    if (!salespersonId) {
      return errorResponse(res, 'Salesperson ID is required', 400);
    }

    const isSuperAdmin = req.user.role === 'SuperAdmin';

    // Update all pending expenses for this specific salesperson
    const updated = await prisma.expense.updateMany({
      where: { 
        salespersonId: salespersonId, 
        status: 'Pending', 
        deletedAt: null 
      },
      data: { 
        status: 'Approved', 
        approvedAt: new Date(), 
        remarks: isSuperAdmin ? 'Bulk Approved by SuperAdmin' : 'Bulk Approved by Admin',
        ...(isSuperAdmin ? {} : { approvedById: req.user.id }) // Skips ID relation if SuperAdmin
      }
    });

    return successResponse(res, { count: updated.count }, `Successfully approved ${updated.count} expenses.`);
  } catch (error) {
    console.error('BULK APPROVE ERROR:', error);
    return errorResponse(res, 'Failed to bulk approve expenses', 500);
  }
};

module.exports = { 
  getExpenseTypes, 
  createExpenseType, 
  updateExpenseType, 
  deleteExpenseType, 
  getExpenses, 
  getExpense, 
  createExpense, 
  submitMonthlyExpenses,
  updateExpense, 
  deleteExpense, 
  approveExpense, 
  rejectExpense,
  getAdminExpenseReports,
  bulkApproveExpenses
};