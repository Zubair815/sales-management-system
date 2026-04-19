const prisma = require('../config/database');

class UserRepository {
  async findSuperAdminByEmail(email) {
    return prisma.superAdmin.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async findAdminByEmail(email) {
    return prisma.admin.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { modulePermissions: true },
    });
  }

  async findSalespersonByEmployeeId(employeeId) {
    return prisma.salesperson.findFirst({
      where: { employeeId, deletedAt: null },
    });
  }

  async findUserById(role, id) {
    const model = role === 'SuperAdmin' ? 'superAdmin'
      : role === 'Admin' ? 'admin'
      : 'salesperson';

    const query = { where: { id, deletedAt: null } };
    if (model === 'admin') {
      query.include = { modulePermissions: true };
    }
    return prisma[model].findFirst(query);
  }

  async updateLastLogin(model, id) {
    return prisma[model].update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async updateFailedAttempts(model, id, data) {
    return prisma[model].update({ where: { id }, data });
  }

  async resetFailedAttempts(model, id) {
    return prisma[model].update({
      where: { id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  }

  async getSuperAdminProfile(id) {
    return prisma.superAdmin.findFirst({
      where: { id },
      select: { id: true, name: true, email: true, status: true, lastLoginAt: true },
    });
  }

  async getAdminProfile(id) {
    return prisma.admin.findFirst({
      where: { id },
      select: { id: true, name: true, email: true, phone: true, status: true, lastLoginAt: true },
      include: { modulePermissions: true },
    });
  }

  async getSalespersonProfile(id) {
    return prisma.salesperson.findFirst({
      where: { id },
      select: { id: true, name: true, employeeId: true, email: true, phone: true, region: true, jobRole: true, status: true },
    });
  }
}

module.exports = new UserRepository();
