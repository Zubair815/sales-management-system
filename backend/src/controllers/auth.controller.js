const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

const LOCK_DURATION = parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || 30) * 60 * 1000;
const MAX_ATTEMPTS = 5;

const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const superAdmin = await prisma.superAdmin.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    if (!superAdmin) {
      await createAuditLog({
        action: 'LOGIN_FAILED',
        module: 'Auth',
        newValues: { email, reason: 'User not found' },
        ipAddress: req.ip,
      });
      return errorResponse(res, 'Invalid credentials', 401);
    }

    if (superAdmin.status === 'Inactive') {
      return errorResponse(res, 'Account is inactive', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      await createAuditLog({
        userId: superAdmin.id,
        userType: 'SuperAdmin',
        superAdminId: superAdmin.id,
        action: 'LOGIN_FAILED',
        module: 'Auth',
        newValues: { reason: 'Invalid password' },
        ipAddress: req.ip,
      });
      return errorResponse(res, 'Invalid credentials', 401);
    }

    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken({
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      role: 'SuperAdmin',
    });

    await createAuditLog({
      userId: superAdmin.id,
      userType: 'SuperAdmin',
      superAdminId: superAdmin.id,
      action: 'LOGIN_SUCCESS',
      module: 'Auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return successResponse(res, {
      token,
      user: {
        id: superAdmin.id,
        name: superAdmin.name,
        email: superAdmin.email,
        role: 'SuperAdmin',
      },
    }, 'Login successful');
  } catch (error) {
    return errorResponse(res, 'Login failed', 500);
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { modulePermissions: true },
    });

    if (!admin) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    if (admin.status === 'Inactive') {
      return errorResponse(res, 'Account is inactive. Contact Super Admin.', 401);
    }

    // Check account lock
    if (admin.lockedUntil && new Date() < admin.lockedUntil) {
      const remaining = Math.ceil((admin.lockedUntil - new Date()) / 60000);
      return errorResponse(res, `Account locked. Try again in ${remaining} minutes.`, 401);
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      const newAttempts = admin.failedAttempts + 1;
      const lockData = newAttempts >= MAX_ATTEMPTS
        ? { failedAttempts: newAttempts, lockedUntil: new Date(Date.now() + LOCK_DURATION) }
        : { failedAttempts: newAttempts };

      await prisma.admin.update({ where: { id: admin.id }, data: lockData });

      if (newAttempts >= MAX_ATTEMPTS) {
        return errorResponse(res, `Account locked due to too many failed attempts. Try again in ${LOCK_DURATION / 60000} minutes.`, 401);
      }
      return errorResponse(res, `Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`, 401);
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const permissions = admin.modulePermissions.reduce((acc, p) => {
      acc[p.moduleName] = p.permissionLevel;
      return acc;
    }, {});

    const token = generateToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'Admin',
      permissions,
    });

    await createAuditLog({
      userId: admin.id,
      userType: 'Admin',
      adminId: admin.id,
      action: 'LOGIN_SUCCESS',
      module: 'Auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return successResponse(res, {
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'Admin',
        permissions,
      },
    }, 'Login successful');
  } catch (error) {
    return errorResponse(res, 'Login failed', 500);
  }
};

const salespersonLogin = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    const salesperson = await prisma.salesperson.findFirst({
      where: { employeeId, deletedAt: null },
    });

    if (!salesperson) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    if (salesperson.status === 'Inactive') {
      return errorResponse(res, 'Account is inactive. Contact admin.', 401);
    }

    // Check account lock
    if (salesperson.lockedUntil && new Date() < salesperson.lockedUntil) {
      const remaining = Math.ceil((salesperson.lockedUntil - new Date()) / 60000);
      return errorResponse(res, `Account locked. Try again in ${remaining} minutes.`, 401);
    }

    const isPasswordValid = await bcrypt.compare(password, salesperson.password);
    if (!isPasswordValid) {
      const newAttempts = salesperson.failedAttempts + 1;
      const lockData = newAttempts >= MAX_ATTEMPTS
        ? { failedAttempts: newAttempts, lockedUntil: new Date(Date.now() + LOCK_DURATION) }
        : { failedAttempts: newAttempts };

      await prisma.salesperson.update({ where: { id: salesperson.id }, data: lockData });

      if (newAttempts >= MAX_ATTEMPTS) {
        return errorResponse(res, `Account locked for ${LOCK_DURATION / 60000} minutes due to too many failed attempts.`, 401);
      }
      return errorResponse(res, `Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`, 401);
    }

    await prisma.salesperson.update({
      where: { id: salesperson.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const token = generateToken({
      id: salesperson.id,
      employeeId: salesperson.employeeId,
      name: salesperson.name,
      role: 'Salesperson',
      region: salesperson.region,
    });

    await createAuditLog({
      userId: salesperson.id,
      userType: 'Salesperson',
      salespersonId: salesperson.id,
      action: 'LOGIN_SUCCESS',
      module: 'Auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return successResponse(res, {
      token,
      user: {
        id: salesperson.id,
        name: salesperson.name,
        employeeId: salesperson.employeeId,
        role: 'Salesperson',
        region: salesperson.region,
        jobRole: salesperson.jobRole,
      },
    }, 'Login successful');
  } catch (error) {
    return errorResponse(res, 'Login failed', 500);
  }
};

const logout = async (req, res) => {
  try {
    await createAuditLog({
      userId: req.user.id,
      userType: req.user.role,
      superAdminId: req.user.role === 'SuperAdmin' ? req.user.id : null,
      adminId: req.user.role === 'Admin' ? req.user.id : null,
      salespersonId: req.user.role === 'Salesperson' ? req.user.id : null,
      action: 'LOGOUT',
      module: 'Auth',
      ipAddress: req.ip,
    });
    return successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    return successResponse(res, null, 'Logged out');
  }
};

const getMe = async (req, res) => {
  try {
    const user = req.user;
    let userData = {};

    if (user.role === 'SuperAdmin') {
      userData = await prisma.superAdmin.findFirst({
        where: { id: user.id },
        select: { id: true, name: true, email: true, status: true, lastLoginAt: true },
      });
    } else if (user.role === 'Admin') {
      userData = await prisma.admin.findFirst({
        where: { id: user.id },
        select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true },
        include: { modulePermissions: true },
      });
    } else if (user.role === 'Salesperson') {
      userData = await prisma.salesperson.findFirst({
        where: { id: user.id },
        select: { id: true, name: true, employeeId: true, email: true, phone: true, region: true, jobRole: true, status: true },
      });
    }

    return successResponse(res, { ...userData, role: user.role });
  } catch (error) {
    return errorResponse(res, 'Failed to get user data', 500);
  }
};

module.exports = { superAdminLogin, adminLogin, salespersonLogin, logout, getMe };
