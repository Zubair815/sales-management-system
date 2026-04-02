const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

const MODULES = [
  'SalespersonManagement', 'PartyManagement', 'ExpenseTypeManagement',
  'InventoryManagement', 'OrderManagement', 'ExpenseManagement',
  'PaymentManagement', 'Reports', 'Announcements', 'Dashboard', 'PrintTemplates'
];

const getAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const skip = (page - 1) * limit;
    const where = { deletedAt: null };
    if (search) where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
    if (status) where.status = status;

    const [admins, total] = await Promise.all([
      prisma.admin.findMany({
        where, skip: parseInt(skip), take: parseInt(limit),
        select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.admin.count({ where }),
    ]);
    return paginatedResponse(res, admins, total, page, limit);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch admins', 500);
  }
};

const getAdmin = async (req, res) => {
  try {
    const admin = await prisma.admin.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { modulePermissions: true },
    });
    if (!admin) return errorResponse(res, 'Admin not found', 404);
    const { password, ...adminData } = admin;
    return successResponse(res, adminData);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch admin', 500);
  }
};

const createAdmin = async (req, res) => {
  try {
    const { name, email, phone, password, status = 'Active' } = req.body;
    const existing = await prisma.admin.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
    if (existing) return errorResponse(res, 'Email already in use', 400);

    const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
    const admin = await prisma.admin.create({
      data: { name, email: email.toLowerCase(), phone, password: hashed, status },
    });

    await createAuditLog({
      userId: req.user.id, userType: 'SuperAdmin', superAdminId: req.user.id,
      action: 'CREATE_ADMIN', module: 'AdminManagement', recordId: admin.id,
      newValues: { name, email }, ipAddress: req.ip,
    });

    const { password: _, ...adminData } = admin;
    return successResponse(res, adminData, 'Admin created successfully', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create admin', 500);
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const existing = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return errorResponse(res, 'Admin not found', 404);

    if (email && email !== existing.email) {
      const emailTaken = await prisma.admin.findFirst({ where: { email: email.toLowerCase(), deletedAt: null, id: { not: req.params.id } } });
      if (emailTaken) return errorResponse(res, 'Email already in use', 400);
    }

    const admin = await prisma.admin.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(email && { email: email.toLowerCase() }), ...(phone && { phone }) },
    });

    await createAuditLog({
      userId: req.user.id, userType: 'SuperAdmin', superAdminId: req.user.id,
      action: 'UPDATE_ADMIN', module: 'AdminManagement', recordId: admin.id,
      oldValues: { name: existing.name, email: existing.email },
      newValues: { name: admin.name, email: admin.email }, ipAddress: req.ip,
    });

    const { password, ...adminData } = admin;
    return successResponse(res, adminData, 'Admin updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update admin', 500);
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const adminId = req.params.id;

    // 1. Check if the admin actually exists
    const admin = await prisma.admin.findFirst({ where: { id: adminId, deletedAt: null } });
    if (!admin) return errorResponse(res, 'Admin not found', 404);

    // --- NEW SECURITY RULES ---

    // RULE 1: Prevent Deletion if Active
    if (admin.status === 'Active') {
      return errorResponse(res, 'Cannot delete an active admin. Please deactivate the admin first.', 400);
    }

    // RULE 2: Remove Access First
    // Count how many modules this admin has access to (anything other than "NoAccess")
    const activePermissions = await prisma.modulePermission.count({
      where: {
        adminId: adminId,
        permissionLevel: { not: 'NoAccess' }
      }
    });
    
    if (activePermissions > 0) {
      return errorResponse(res, 'Cannot delete admin with active module permissions. Please revoke all access (set to "NoAccess") first.', 400);
    }

    // RULE 3: The "Last Admin" Rule
    // Count how many total active/inactive admins exist in the database
    const totalAdmins = await prisma.admin.count({
      where: { deletedAt: null }
    });
    
    if (totalAdmins <= 1) {
      return errorResponse(res, 'Critical Safety Check: Cannot delete the last remaining admin in the system.', 400);
    }

    // --- END SECURITY RULES ---

    // Proceed with the soft delete
    await prisma.admin.update({ where: { id: adminId }, data: { deletedAt: new Date() } });
    
    // Log the secure deletion in the audit trail
    await createAuditLog({
      userId: req.user.id, userType: 'SuperAdmin', superAdminId: req.user.id,
      action: 'DELETE_ADMIN', module: 'AdminManagement', recordId: adminId,
      oldValues: { name: admin.name, email: admin.email }, ipAddress: req.ip,
    });
    
    return successResponse(res, null, 'Admin safely deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete admin', 500);
  }
};

const toggleAdminStatus = async (req, res) => {
  try {
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!admin) return errorResponse(res, 'Admin not found', 404);
    const newStatus = admin.status === 'Active' ? 'Inactive' : 'Active';
    await prisma.admin.update({ where: { id: req.params.id }, data: { status: newStatus } });
    await createAuditLog({
      userId: req.user.id, userType: 'SuperAdmin', superAdminId: req.user.id,
      action: 'TOGGLE_ADMIN_STATUS', module: 'AdminManagement', recordId: req.params.id,
      oldValues: { status: admin.status }, newValues: { status: newStatus }, ipAddress: req.ip,
    });
    return successResponse(res, { status: newStatus }, `Admin ${newStatus === 'Active' ? 'activated' : 'deactivated'}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update admin status', 500);
  }
};

const resetAdminPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8 || password.length > 12) {
      return errorResponse(res, 'Password must be 8-12 characters', 400);
    }
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!admin) return errorResponse(res, 'Admin not found', 404);
    const hashed = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
    await prisma.admin.update({ where: { id: req.params.id }, data: { password: hashed, failedAttempts: 0, lockedUntil: null } });
    await createAuditLog({
      userId: req.user.id, userType: 'SuperAdmin', superAdminId: req.user.id,
      action: 'RESET_ADMIN_PASSWORD', module: 'AdminManagement', recordId: req.params.id, ipAddress: req.ip,
    });
    return successResponse(res, null, 'Password reset successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to reset password', 500);
  }
};

const getAdminPermissions = async (req, res) => {
  try {
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!admin) return errorResponse(res, 'Admin not found', 404);
    const permissions = await prisma.modulePermission.findMany({ where: { adminId: req.params.id } });
    const permMap = MODULES.reduce((acc, m) => {
      const p = permissions.find(p => p.moduleName === m);
      acc[m] = p ? p.permissionLevel : 'NoAccess';
      return acc;
    }, {});
    return successResponse(res, { adminId: req.params.id, permissions: permMap });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch permissions', 500);
  }
};

const updateAdminPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const admin = await prisma.admin.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!admin) return errorResponse(res, 'Admin not found', 404);

    const oldPerms = await prisma.modulePermission.findMany({ where: { adminId: req.params.id } });
    const oldPermMap = oldPerms.reduce((acc, p) => { acc[p.moduleName] = p.permissionLevel; return acc; }, {});

    const upserts = Object.entries(permissions).map(([moduleName, permissionLevel]) =>
      prisma.modulePermission.upsert({
        where: { adminId_moduleName: { adminId: req.params.id, moduleName } },
        update: { permissionLevel },
        create: { adminId: req.params.id, moduleName, permissionLevel },
      })
    );
    await Promise.all(upserts);

    await createAuditLog({
      userId: req.user.id, userType: 'SuperAdmin', superAdminId: req.user.id,
      action: 'UPDATE_PERMISSIONS', module: 'ModuleAccess', recordId: req.params.id,
      oldValues: oldPermMap, newValues: permissions, ipAddress: req.ip,
    });
    return successResponse(res, null, 'Permissions updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update permissions', 500);
  }
};

const clonePermissions = async (req, res) => {
  try {
    const { id: targetAdminId, sourceId } = req.params;
    const sourcePerms = await prisma.modulePermission.findMany({ where: { adminId: sourceId } });
    const upserts = sourcePerms.map(p =>
      prisma.modulePermission.upsert({
        where: { adminId_moduleName: { adminId: targetAdminId, moduleName: p.moduleName } },
        update: { permissionLevel: p.permissionLevel },
        create: { adminId: targetAdminId, moduleName: p.moduleName, permissionLevel: p.permissionLevel },
      })
    );
    await Promise.all(upserts);
    return successResponse(res, null, 'Permissions cloned successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to clone permissions', 500);
  }
};

const getConfigs = async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany();
    const configMap = configs.reduce((acc, c) => { acc[c.key] = c.value; return acc; }, {});
    return successResponse(res, configMap);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch configs', 500);
  }
};

const updateConfigs = async (req, res) => {
  try {
    const configs = req.body;
    const upserts = Object.entries(configs).map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );
    await Promise.all(upserts);
    return successResponse(res, null, 'Configs updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update configs', 500);
  }
};

const getStats = async (req, res) => {
  try {
    const [admins, salespersons, orders, revenue, expenses] = await Promise.all([
      prisma.admin.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.salesperson.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.aggregate({ where: { deletedAt: null, status: { not: 'Cancelled' } }, _sum: { grandTotal: true } }),
      prisma.expense.aggregate({ where: { deletedAt: null, status: 'Approved' }, _sum: { amount: true } }),
    ]);
    return successResponse(res, {
      activeAdmins: admins, activeSalespersons: salespersons,
      totalOrders: orders, totalRevenue: revenue._sum.grandTotal || 0,
      totalExpenses: expenses._sum.amount || 0,
    });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch stats', 500);
  }
};

module.exports = {
  getAdmins, getAdmin, createAdmin, updateAdmin, deleteAdmin,
  toggleAdminStatus, resetAdminPassword, getAdminPermissions,
  updateAdminPermissions, clonePermissions, getConfigs, updateConfigs, getStats,
};
