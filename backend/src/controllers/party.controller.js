const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

const getParties = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { deletedAt: null };
    if (status) where.status = status;
    else if (req.user.role === 'Salesperson') where.status = 'Active';
    if (search) where.OR = [
      { name: { contains: search} },
      { phone: { contains: search } },
      { gstNumber: { contains: search} },
    ];

    const [parties, total] = await Promise.all([
      prisma.party.findMany({ where, skip, take: parseInt(limit), orderBy: { name: 'asc' } }),
      prisma.party.count({ where }),
    ]);
    return paginatedResponse(res, parties, total, page, limit);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch parties', 500);
  }
};

const getParty = async (req, res) => {
  try {
    const party = await prisma.party.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!party) return errorResponse(res, 'Party not found', 404);
    return successResponse(res, party);
  } catch (error) {
    return errorResponse(res, 'Failed to fetch party', 500);
  }
};

const createParty = async (req, res) => {
  try {
    const { name, contactName, phone, email, address, city, state, gstNumber } = req.body;
    if (!name || !phone) return errorResponse(res, 'Name and phone are required', 400);
    const party = await prisma.party.create({ data: { name, contactName, phone, email, address, city, state, gstNumber } });
    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'CREATE_PARTY', module: 'PartyManagement', recordId: party.id, newValues: { name }, ipAddress: req.ip });
    return successResponse(res, party, 'Party created', 201);
  } catch (error) {
    return errorResponse(res, 'Failed to create party', 500);
  }
};

const updateParty = async (req, res) => {
  try {
    const existing = await prisma.party.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!existing) return errorResponse(res, 'Party not found', 404);
    const { name, contactName, phone, email, address, city, state, gstNumber } = req.body;
    const party = await prisma.party.update({ where: { id: req.params.id }, data: { name, contactName, phone, email, address, city, state, gstNumber } });
    return successResponse(res, party, 'Party updated');
  } catch (error) {
    return errorResponse(res, 'Failed to update party', 500);
  }
};

const deleteParty = async (req, res) => {
  try {
    const party = await prisma.party.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!party) return errorResponse(res, 'Party not found', 404);
    await prisma.party.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    return successResponse(res, null, 'Party deleted');
  } catch (error) {
    return errorResponse(res, 'Failed to delete party', 500);
  }
};

const toggleStatus = async (req, res) => {
  try {
    const party = await prisma.party.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!party) return errorResponse(res, 'Party not found', 404);
    const newStatus = party.status === 'Active' ? 'Inactive' : 'Active';
    await prisma.party.update({ where: { id: req.params.id }, data: { status: newStatus } });
    return successResponse(res, { status: newStatus }, `Party ${newStatus}`);
  } catch (error) {
    return errorResponse(res, 'Failed to update status', 500);
  }
};

module.exports = { getParties, getParty, createParty, updateParty, deleteParty, toggleStatus };
