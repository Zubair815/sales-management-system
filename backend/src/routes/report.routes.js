// routes/report.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkModulePermission } = require('../middleware/auth');
const ctrl = require('../controllers/report.controller');

router.use(authenticate, authorize('SuperAdmin', 'Admin'), checkModulePermission('Reports', 'ViewOnly'));

router.get('/order-payment', ctrl.orderPaymentReport);
router.get('/expense-budget', ctrl.expenseBudgetReport);
router.get('/payment-collection', ctrl.paymentCollectionReport);
router.get('/salesperson-performance', ctrl.salespersonPerformanceReport);
router.get('/inventory-valuation', ctrl.inventoryValuationReport);

router.get('/order-payment/export', ctrl.exportOrderPaymentReport);
router.get('/payment-collection/export', ctrl.exportPaymentCollectionReport);
router.get('/salesperson-performance/export', ctrl.exportSalespersonReport);

module.exports = router;
