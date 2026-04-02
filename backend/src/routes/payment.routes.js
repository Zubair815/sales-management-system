// routes/payment.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkModulePermission } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/validation');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/payment.controller');

router.use(authenticate);

router.get('/', ctrl.getPayments);
router.post('/', authorize('Salesperson', 'SuperAdmin', 'Admin'), (req, res, next) => { req.uploadSubDir = 'payments'; next(); }, upload.single('proof'), sanitizeInputs, ctrl.createPayment);
router.get('/:id', ctrl.getPayment);
router.delete('/:id', authorize('SuperAdmin'), ctrl.deletePayment);
router.patch('/:id/verify', authorize('SuperAdmin', 'Admin'), checkModulePermission('PaymentManagement', 'FullAccess'), ctrl.verifyPayment);
router.patch('/:id/reject', authorize('SuperAdmin', 'Admin'), checkModulePermission('PaymentManagement', 'FullAccess'), sanitizeInputs, ctrl.rejectPayment);

module.exports = router;
