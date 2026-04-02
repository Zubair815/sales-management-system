// routes/announcement.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkModulePermission } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/validation');
const { upload } = require('../middleware/upload');
const ctrl = require('../controllers/announcement.controller');

router.use(authenticate);

// Admin routes
router.get('/admin', authorize('SuperAdmin', 'Admin'), checkModulePermission('Announcements', 'ViewOnly'), ctrl.getAdminAnnouncements);
router.post('/', authorize('SuperAdmin', 'Admin'), checkModulePermission('Announcements', 'FullAccess'), (req, res, next) => { req.uploadSubDir = 'announcements'; next(); }, upload.single('attachment'), sanitizeInputs, ctrl.createAnnouncement);
router.post('/:id/send', authorize('SuperAdmin', 'Admin'), checkModulePermission('Announcements', 'FullAccess'), ctrl.sendAnnouncement);
router.get('/:id/stats', authorize('SuperAdmin', 'Admin'), checkModulePermission('Announcements', 'ViewOnly'), ctrl.getAnnouncementStats);
router.delete('/:id', authorize('SuperAdmin', 'Admin'), checkModulePermission('Announcements', 'FullAccess'), ctrl.deleteAnnouncement);

// Salesperson routes
router.get('/inbox', authorize('Salesperson'), ctrl.getSalespersonAnnouncements);
router.post('/:id/read', authorize('Salesperson'), ctrl.markAsRead);

module.exports = router;
