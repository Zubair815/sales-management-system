const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { successResponse, errorResponse } = require('../utils/response');
const prisma = require('../config/database');

router.use(authenticate);

router.get('/profile', authorize('Admin'), async (req, res) => {
  try {
    const admin = await prisma.admin.findFirst({
      where: { id: req.user.id },
      include: { modulePermissions: true },
    });
    if (!admin) return errorResponse(res, 'Not found', 404);
    const { password, ...data } = admin;
    return successResponse(res, data);
  } catch (e) { return errorResponse(res, 'Error', 500); }
});

module.exports = router;
