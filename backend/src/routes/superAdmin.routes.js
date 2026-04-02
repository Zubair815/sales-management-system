const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitizeInputs } = require('../middleware/validation');
const superAdminController = require('../controllers/superAdmin.controller');

const adminValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone required'),
  body('password')
    .isLength({ min: 8, max: 12 })
    .withMessage('Password must be 8-12 characters')
    .isAlphanumeric()
    .withMessage('Password must be alphanumeric'),
];

router.use(authenticate, authorize('SuperAdmin'));

router.get('/admins', superAdminController.getAdmins);
router.post('/admins', sanitizeInputs, adminValidation, validate, superAdminController.createAdmin);
router.get('/admins/:id', superAdminController.getAdmin);
router.put('/admins/:id', sanitizeInputs, superAdminController.updateAdmin);
router.delete('/admins/:id', superAdminController.deleteAdmin);
router.patch('/admins/:id/status', superAdminController.toggleAdminStatus);
router.patch('/admins/:id/reset-password', sanitizeInputs, superAdminController.resetAdminPassword);

// Module permissions
router.get('/admins/:id/permissions', superAdminController.getAdminPermissions);
router.put('/admins/:id/permissions', sanitizeInputs, superAdminController.updateAdminPermissions);
router.post('/admins/:id/clone-permissions/:sourceId', superAdminController.clonePermissions);

// System config
router.get('/configs', superAdminController.getConfigs);
router.put('/configs', sanitizeInputs, superAdminController.updateConfigs);

// Stats
router.get('/stats', superAdminController.getStats);

module.exports = router;
