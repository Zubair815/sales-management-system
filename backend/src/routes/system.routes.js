// routes/system.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

router.use(authenticate, authorize('SuperAdmin'));

router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { database: 'connected', uptime: process.uptime(), memory: process.memoryUsage(), timestamp: new Date() } });
  } catch (e) { errorResponse(res, 'Health check failed', 500); }
});

module.exports = router;
