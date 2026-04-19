const { verifyAccessToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');
const prisma = require('../config/database');

// Authenticate JWT token — reads from HttpOnly cookie (primary) or Authorization header (fallback)
const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken ||
      (req.headers.authorization?.startsWith('Bearer ') && req.headers.authorization.split(' ')[1]);

    if (!token) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const decoded = verifyAccessToken(token);

    // Verify user still exists and is active
    let user = null;
    if (decoded.role === 'SuperAdmin') {
      user = await prisma.superAdmin.findFirst({
        where: { id: decoded.id, deletedAt: null },
      });
    } else if (decoded.role === 'Admin') {
      user = await prisma.admin.findFirst({
        where: { id: decoded.id, deletedAt: null, status: 'Active' },
        include: { modulePermissions: true },
      });
    } else if (decoded.role === 'Salesperson') {
      user = await prisma.salesperson.findFirst({
        where: { id: decoded.id, deletedAt: null, status: 'Active' },
      });
    }

    if (!user) {
      return errorResponse(res, 'User not found or inactive', 401);
    }

    req.user = { ...user, role: decoded.role };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired', 401);
    }
    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 'Invalid token', 401);
    }
    return errorResponse(res, 'Authentication failed', 401);
  }
};

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }
    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 'Access denied - insufficient permissions', 403);
    }
    next();
  };
};

// Check module permission
const checkModulePermission = (moduleName, requiredLevel) => {
  const levelHierarchy = {
    'NoAccess': 0,
    'ViewOnly': 1,
    'ViewEdit': 2,
    'FullAccess': 3,
  };

  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required', 401);
    }

    // Super Admin has full access to everything
    if (req.user.role === 'SuperAdmin') {
      return next();
    }

    // Salesperson has no access to admin modules
    if (req.user.role === 'Salesperson') {
      return errorResponse(res, 'Access denied', 403);
    }

    // Admin - check module permissions
    if (req.user.role === 'Admin') {
      const permission = req.user.modulePermissions?.find(
        (p) => p.moduleName === moduleName
      );

      if (!permission || permission.permissionLevel === 'NoAccess') {
        return errorResponse(res, `Access denied to module: ${moduleName}`, 403);
      }

      const userLevel = levelHierarchy[permission.permissionLevel] || 0;
      const requiredLevelNum = levelHierarchy[requiredLevel] || 0;

      if (userLevel < requiredLevelNum) {
        return errorResponse(
          res,
          `Insufficient permission. Required: ${requiredLevel}, Current: ${permission.permissionLevel}`,
          403
        );
      }
    }

    next();
  };
};

module.exports = { authenticate, authorize, checkModulePermission };
