// routes/print.routes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { sanitizeInputs } = require('../middleware/validation');
const { logoUpload } = require('../middleware/upload');
const ctrl = require('../controllers/print.controller');

router.use(authenticate);

router.get('/templates', ctrl.getTemplates);
router.get('/templates/:name', ctrl.getTemplate);
router.put('/templates/:name', sanitizeInputs, ctrl.updateTemplate);
router.post('/templates/logo', logoUpload.single('logo'), ctrl.uploadLogo);

module.exports = router;
