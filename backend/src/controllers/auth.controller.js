const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');
const { COOKIE_OPTIONS } = require('../config/env');

const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginSuperAdmin(email, password, {
      ip: req.ip, userAgent: req.headers['user-agent'],
    });

    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS.access);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS.refresh);

    return successResponse(res, { user: result.user }, 'Login successful');
  } catch (error) {
    return errorResponse(res, error.message, error.status || 500);
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginAdmin(email, password, {
      ip: req.ip, userAgent: req.headers['user-agent'],
    });

    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS.access);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS.refresh);

    return successResponse(res, { user: result.user }, 'Login successful');
  } catch (error) {
    return errorResponse(res, error.message, error.status || 500);
  }
};

const salespersonLogin = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    const result = await authService.loginSalesperson(employeeId, password, {
      ip: req.ip, userAgent: req.headers['user-agent'],
    });

    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS.access);
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS.refresh);

    return successResponse(res, { user: result.user }, 'Login successful');
  } catch (error) {
    return errorResponse(res, error.message, error.status || 500);
  }
};

const refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return errorResponse(res, 'No refresh token', 401);
    }

    const result = await authService.refresh(token);

    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS.access);
    return successResponse(res, { user: result.user }, 'Token refreshed');
  } catch (error) {
    // Clear invalid cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return errorResponse(res, 'Session expired, please login again', 401);
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
  } catch (error) {
    // Audit log failure shouldn't block logout
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth' });
  return successResponse(res, null, 'Logged out successfully');
};

const getMe = async (req, res) => {
  try {
    const userData = await authService.getProfile(req.user.role, req.user.id);
    return successResponse(res, { ...userData, role: req.user.role });
  } catch (error) {
    return errorResponse(res, 'Failed to get user data', 500);
  }
};

module.exports = { superAdminLogin, adminLogin, salespersonLogin, refreshToken, logout, getMe };
