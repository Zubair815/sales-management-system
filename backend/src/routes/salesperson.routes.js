// routes/salesperson.routes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize, checkModulePermission } = require('../middleware/auth');
const { validate, sanitizeInputs } = require('../middleware/validation');
const ctrl = require('../controllers/salesperson.controller');

const spValidation = [
  body('name').notEmpty().withMessage('Name required'),
  body('employeeId').isAlphanumeric().isLength({ min: 8, max: 12 }).withMessage('Employee ID must be 8-12 alphanumeric chars'),
  body('phone').notEmpty().withMessage('Phone required'),
  body('password').isAlphanumeric().isLength({ min: 8, max: 12 }).withMessage('Password must be 8-12 alphanumeric chars'),
];

router.use(authenticate);

router.get('/', authorize('SuperAdmin', 'Admin'), checkModulePermission('SalespersonManagement', 'ViewOnly'), ctrl.getSalespersons);
router.post('/', authorize('SuperAdmin', 'Admin'), checkModulePermission('SalespersonManagement', 'FullAccess'), sanitizeInputs, spValidation, validate, ctrl.createSalesperson);
router.get('/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('SalespersonManagement', 'ViewOnly'), ctrl.getSalesperson);
router.put('/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('SalespersonManagement', 'ViewEdit'), sanitizeInputs, ctrl.updateSalesperson);
router.delete('/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('SalespersonManagement', 'FullAccess'), ctrl.deleteSalesperson);
router.patch('/:id/status', authorize('SuperAdmin', 'Admin'), checkModulePermission('SalespersonManagement', 'FullAccess'), ctrl.toggleStatus);
router.patch('/:id/reset-password', authorize('SuperAdmin', 'Admin'), checkModulePermission('SalespersonManagement', 'FullAccess'), sanitizeInputs, ctrl.resetPassword);

module.exports = router;
