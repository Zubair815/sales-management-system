// routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/dashboard.controller');

router.use(authenticate);
router.get('/admin', authorize('SuperAdmin', 'Admin'), ctrl.getAdminDashboard);
router.get('/salesperson', authorize('Salesperson'), ctrl.getSalespersonDashboard);
router.get('/super-admin', authorize('SuperAdmin'), ctrl.getSuperAdminDashboard);

module.exports = router;
