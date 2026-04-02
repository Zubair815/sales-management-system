// routes/expense.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkModulePermission } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/validation');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/expense.controller');

router.use(authenticate);

// Expense Types
router.get('/types', ctrl.getExpenseTypes);
router.post('/types', authorize('SuperAdmin', 'Admin'), checkModulePermission('ExpenseTypeManagement', 'FullAccess'), sanitizeInputs, ctrl.createExpenseType);
router.put('/types/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('ExpenseTypeManagement', 'ViewEdit'), sanitizeInputs, ctrl.updateExpenseType);
router.delete('/types/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('ExpenseTypeManagement', 'FullAccess'), ctrl.deleteExpenseType);

// Expenses
router.get('/', ctrl.getExpenses);

// --- Admin Grouped Reports ---
router.get('/reports/admin', authorize('SuperAdmin', 'Admin'), ctrl.getAdminExpenseReports);

// --- NEW ROUTE: Bulk Approve ---
// Must be above /:id routes to prevent collisions
router.post('/bulk-approve', authorize('SuperAdmin', 'Admin'), checkModulePermission('ExpenseManagement', 'FullAccess'), sanitizeInputs, ctrl.bulkApproveExpenses);

// --- Submit Monthly Batch ---
router.post('/submit-batch', authorize('Salesperson'), ctrl.submitMonthlyExpenses);

// Standard Expense Routes
router.post('/', authorize('Salesperson', 'SuperAdmin', 'Admin'), (req, res, next) => { req.uploadSubDir = 'expenses'; next(); }, upload.single('proof'), sanitizeInputs, ctrl.createExpense);
router.get('/:id', ctrl.getExpense);
router.put('/:id', sanitizeInputs, ctrl.updateExpense);
router.delete('/:id', authorize('SuperAdmin'), ctrl.deleteExpense);

// Approvals
router.patch('/:id/approve', authorize('SuperAdmin', 'Admin'), checkModulePermission('ExpenseManagement', 'FullAccess'), sanitizeInputs, ctrl.approveExpense);
router.patch('/:id/reject', authorize('SuperAdmin', 'Admin'), checkModulePermission('ExpenseManagement', 'FullAccess'), sanitizeInputs, ctrl.rejectExpense);

module.exports = router;