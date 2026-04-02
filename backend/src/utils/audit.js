const prisma = require('../config/database');
const logger = require('./logger');

const createAuditLog = async ({
  userId,
  userType,
  superAdminId,
  adminId,
  salespersonId,
  action,
  module,
  recordId,
  oldValues,
  newValues,
  ipAddress,
  userAgent,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userType,
        superAdminId,
        adminId,
        salespersonId,
        action,
        module,
        recordId,
        oldValues,
        newValues,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
};

const auditMiddleware = (module, action) => {
  return async (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = req.user;
        if (user) {
          createAuditLog({
            userId: user.id,
            userType: user.role,
            superAdminId: user.role === 'SuperAdmin' ? user.id : null,
            adminId: user.role === 'Admin' ? user.id : null,
            salespersonId: user.role === 'Salesperson' ? user.id : null,
            action,
            module,
            recordId: req.params.id || null,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          });
        }
      }
    });
    next();
  };
};

module.exports = { createAuditLog, auditMiddleware };
