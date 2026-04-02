const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkModulePermission } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/validation');
const ctrl = require('../controllers/inventory.controller');

router.use(authenticate);

router.get('/', ctrl.getItems);
router.post('/', authorize('SuperAdmin', 'Admin'), checkModulePermission('InventoryManagement', 'FullAccess'), sanitizeInputs, ctrl.createItem);
router.get('/low-stock', authorize('SuperAdmin', 'Admin'), ctrl.getLowStockItems);
router.get('/:id', ctrl.getItem);
router.put('/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('InventoryManagement', 'ViewEdit'), sanitizeInputs, ctrl.updateItem);
router.delete('/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('InventoryManagement', 'FullAccess'), ctrl.deleteItem);
router.patch('/:id/stock', authorize('SuperAdmin', 'Admin'), checkModulePermission('InventoryManagement', 'ViewEdit'), sanitizeInputs, ctrl.adjustStock);

module.exports = router;
