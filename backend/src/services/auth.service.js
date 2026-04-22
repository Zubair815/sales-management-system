const bcrypt = require('bcryptjs');
const userRepo = require('../repositories/user.repository');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { createAuditLog } = require('../utils/audit');

const LOCK_DURATION = parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || 30) * 60 * 1000;
const MAX_ATTEMPTS = 5;

class AuthService {
  /**
   * Super Admin login — no account locking (trusted role)
   */
  async loginSuperAdmin(email, password, meta) {
    const user = await userRepo.findSuperAdminByEmail(email);
    if (!user) {
      await createAuditLog({
        action: 'LOGIN_FAILED', module: 'Auth',
        newValues: { email, reason: 'User not found' },
        ipAddress: meta.ip,
      });
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    if (user.status === 'Inactive') {
      throw Object.assign(new Error('Account is inactive'), { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await createAuditLog({
        userId: user.id, userType: 'SuperAdmin', superAdminId: user.id,
        action: 'LOGIN_FAILED', module: 'Auth',
        newValues: { reason: 'Invalid password' },
        ipAddress: meta.ip,
      });
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    await userRepo.updateLastLogin('superAdmin', user.id);

    const payload = { id: user.id, email: user.email, name: user.name, role: 'SuperAdmin' };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await createAuditLog({
      userId: user.id, userType: 'SuperAdmin', superAdminId: user.id,
      action: 'LOGIN_SUCCESS', module: 'Auth',
      ipAddress: meta.ip, userAgent: meta.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: 'SuperAdmin' },
    };
  }

  /**
   * Admin login — with account locking on repeated failures
   */
  async loginAdmin(email, password, meta) {
    const user = await userRepo.findAdminByEmail(email);
    if (!user) {
      return this._failLogin(null, 'Admin', { email }, meta);
    }

    if (user.status === 'Inactive') {
      throw Object.assign(new Error('Account is inactive. Contact Super Admin.'), { status: 401 });
    }

    this._checkAccountLock(user);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return this._handleFailedAttempt('admin', user);
    }

    await userRepo.resetFailedAttempts('admin', user.id);
    await userRepo.updateLastLogin('admin', user.id);

    const permissions = user.modulePermissions.reduce((acc, p) => {
      acc[p.moduleName] = p.permissionLevel;
      return acc;
    }, {});

    const payload = { id: user.id, email: user.email, name: user.name, role: 'Admin', permissions };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await createAuditLog({
      userId: user.id, userType: 'Admin', adminId: user.id,
      action: 'LOGIN_SUCCESS', module: 'Auth',
      ipAddress: meta.ip, userAgent: meta.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: 'Admin', permissions },
    };
  }

  /**
   * Salesperson login — with account locking on repeated failures
   */
  async loginSalesperson(employeeId, password, meta) {
    const user = await userRepo.findSalespersonByEmployeeId(employeeId);
    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }

    if (user.status === 'Inactive') {
      throw Object.assign(new Error('Account is inactive. Contact admin.'), { status: 401 });
    }

    this._checkAccountLock(user);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return this._handleFailedAttempt('salesperson', user);
    }

    await userRepo.resetFailedAttempts('salesperson', user.id);
    await userRepo.updateLastLogin('salesperson', user.id);

    const payload = {
      id: user.id, employeeId: user.employeeId, name: user.name,
      role: 'Salesperson', region: user.region,
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await createAuditLog({
      userId: user.id, userType: 'Salesperson', salespersonId: user.id,
      action: 'LOGIN_SUCCESS', module: 'Auth',
      ipAddress: meta.ip, userAgent: meta.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id, name: user.name, employeeId: user.employeeId,
        role: 'Salesperson', region: user.region, jobRole: user.jobRole,
      },
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token
   */
  async refresh(refreshTokenStr) {
    const decoded = verifyRefreshToken(refreshTokenStr);

    // Verify user still exists and is active
    const user = await userRepo.findUserById(decoded.role, decoded.id);
    if (!user) {
      throw Object.assign(new Error('User not found or inactive'), { status: 401 });
    }
    if (user.status === 'Inactive') {
      throw Object.assign(new Error('Account is inactive'), { status: 401 });
    }

    // Build payload based on role
    let payload;
    if (decoded.role === 'SuperAdmin') {
      payload = { id: user.id, email: user.email, name: user.name, role: 'SuperAdmin' };
    } else if (decoded.role === 'Admin') {
      const permissions = user.modulePermissions
        ? user.modulePermissions.reduce((acc, p) => { acc[p.moduleName] = p.permissionLevel; return acc; }, {})
        : {};
      payload = { id: user.id, email: user.email, name: user.name, role: 'Admin', permissions };
    } else {
      payload = { id: user.id, employeeId: user.employeeId, name: user.name, role: 'Salesperson', region: user.region };
    }

    const accessToken = generateAccessToken(payload);
    return { accessToken, user: payload };
  }

  /**
   * Get user profile data
   */
  async getProfile(role, id) {
    if (role === 'SuperAdmin') {
      return userRepo.getSuperAdminProfile(id);
    } else if (role === 'Admin') {
      return userRepo.getAdminProfile(id);
    } else {
      return userRepo.getSalespersonProfile(id);
    }
  }

  // ─── Private helpers ──────────────────────────────────────

  _checkAccountLock(user) {
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const remaining = Math.ceil((user.lockedUntil - new Date()) / 60000);
      throw Object.assign(
        new Error(`Account locked. Try again in ${remaining} minutes.`),
        { status: 401 }
      );
    }
  }

  async _handleFailedAttempt(model, user) {
    const newAttempts = user.failedAttempts + 1;
    const lockData = newAttempts >= MAX_ATTEMPTS
      ? { failedAttempts: newAttempts, lockedUntil: new Date(Date.now() + LOCK_DURATION) }
      : { failedAttempts: newAttempts };

    await userRepo.updateFailedAttempts(model, user.id, lockData);

    if (newAttempts >= MAX_ATTEMPTS) {
      throw Object.assign(
        new Error(`Account locked for ${LOCK_DURATION / 60000} minutes due to too many failed attempts.`),
        { status: 401 }
      );
    }
    throw Object.assign(
      new Error(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`),
      { status: 401 }
    );
  }

  async _failLogin(userId, userType, newValues, meta) {
    await createAuditLog({
      userId, userType,
      action: 'LOGIN_FAILED', module: 'Auth',
      newValues: { ...newValues, reason: 'User not found' },
      ipAddress: meta.ip,
    });
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }
}

module.exports = new AuthService();
