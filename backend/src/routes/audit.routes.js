const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const prisma = require('../config/database');
const { paginatedResponse, errorResponse } = require('../utils/response');

router.use(authenticate, authorize('SuperAdmin'));

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, module, action, userType, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (module) where.module = { contains: module, mode: 'insensitive' };
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (userType) where.userType = userType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.count({ where }),
    ]);
    return paginatedResponse(res, logs, total, page, limit);
  } catch (e) { return errorResponse(res, 'Failed to fetch audit logs', 500); }
});

module.exports = router;
