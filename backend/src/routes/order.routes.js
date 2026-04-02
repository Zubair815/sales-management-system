const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkModulePermission } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/validation');
const ctrl = require('../controllers/order.controller');

router.use(authenticate);

// Salesperson and Admin can view orders (filtered by role)
router.get('/', ctrl.getOrders);
router.post('/', authorize('Salesperson', 'SuperAdmin', 'Admin'), sanitizeInputs, ctrl.createOrder);
router.get('/:id', ctrl.getOrder);
router.put('/:id', sanitizeInputs, ctrl.updateOrder);
router.delete('/:id', authorize('SuperAdmin'), ctrl.deleteOrder);

// Status transitions - Admin/SuperAdmin only
router.patch('/:id/approve', authorize('SuperAdmin', 'Admin'), checkModulePermission('OrderManagement', 'FullAccess'), ctrl.approveOrder);
router.patch('/:id/dispatch', authorize('SuperAdmin', 'Admin'), checkModulePermission('OrderManagement', 'FullAccess'), ctrl.dispatchOrder);
router.patch('/:id/deliver', authorize('SuperAdmin', 'Admin'), checkModulePermission('OrderManagement', 'FullAccess'), ctrl.deliverOrder);
router.patch('/:id/cancel', ctrl.cancelOrder);

// Print
router.get('/:id/print', ctrl.getPrintData);
router.post('/batch-print', ctrl.batchPrint);

module.exports = router;
