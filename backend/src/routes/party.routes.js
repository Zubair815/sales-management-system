// routes/party.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkModulePermission } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/validation');
const ctrl = require('../controllers/party.controller');

router.use(authenticate);

router.get('/', ctrl.getParties);
router.post('/', authorize('SuperAdmin', 'Admin'), checkModulePermission('PartyManagement', 'FullAccess'), sanitizeInputs, ctrl.createParty);
router.get('/:id', ctrl.getParty);
router.put('/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('PartyManagement', 'ViewEdit'), sanitizeInputs, ctrl.updateParty);
router.delete('/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('PartyManagement', 'FullAccess'), ctrl.deleteParty);
router.patch('/:id/status', authorize('SuperAdmin', 'Admin'), checkModulePermission('PartyManagement', 'FullAccess'), ctrl.toggleStatus);

module.exports = router;
