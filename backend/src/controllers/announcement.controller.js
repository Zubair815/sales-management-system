const prisma = require('../config/database');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { createAuditLog } = require('../utils/audit');

const getAdminAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = { deletedAt: null };
    if (req.user.role === 'Admin') where.createdById = req.user.id;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where, skip, take: parseInt(limit),
        include: {
          createdBy: { select: { name: true } },
          _count: { select: { reads: true, recipients: true } },
          reads: { include: { salesperson: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.announcement.count({ where }),
    ]);

    const superAdminIds = announcements.filter(a => !a.createdBy).map(a => a.createdById);
    let saMap = {};
    if (superAdminIds.length > 0) {
      const superAdmins = await prisma.superAdmin.findMany({
        where: { id: { in: superAdminIds } },
        select: { id: true, name: true }
      });
      superAdmins.forEach(sa => saMap[sa.id] = sa.name);
    }

    const formatted = announcements.map(a => ({
      ...a,
      createdBy: a.createdBy || { name: saMap[a.createdById] || 'Unknown' }
    }));

    return paginatedResponse(res, formatted, total, page, limit);
  } catch (e) { 
    console.error(e);
    return errorResponse(res, 'Failed to fetch announcements', 500); 
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, message, priority = 'Medium', expiryDate, targetType = 'All', targetRegions, targetRoles, targetSpecificIds } = req.body;
    if (!title || !message) return errorResponse(res, 'Title and message required', 400);

    const attachmentPath = req.file ? req.file.path : null;

    const ann = await prisma.announcement.create({
      data: {
        createdById: req.user.id, title, message, priority,
        attachmentPath, expiryDate: expiryDate ? new Date(expiryDate) : null,
        targetType, status: 'Draft',
        targetRegions: targetRegions ? (Array.isArray(targetRegions) ? targetRegions : [targetRegions]) : [],
        targetRoles: targetRoles ? (Array.isArray(targetRoles) ? targetRoles : [targetRoles]) : [],
        targetSpecificIds: targetSpecificIds ? (Array.isArray(targetSpecificIds) ? targetSpecificIds : [targetSpecificIds]) : [],
      },
    });
    return successResponse(res, ann, 'Announcement created', 201);
  } catch (e) { return errorResponse(res, 'Failed to create announcement', 500); }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { title, message, priority, expiryDate, targetType, targetRegions, targetRoles, targetSpecificIds } = req.body;
    const ann = await prisma.announcement.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!ann) return errorResponse(res, 'Announcement not found', 404);
    if (ann.status !== 'Draft') return errorResponse(res, 'Only draft announcements can be edited', 400);

    let attachmentPath = ann.attachmentPath;
    if (req.file) {
      attachmentPath = req.file.path;
    }

    const updated = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        title, message, priority, attachmentPath,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        targetType,
        targetRegions: targetRegions ? (Array.isArray(targetRegions) ? targetRegions : [targetRegions]) : [],
        targetRoles: targetRoles ? (Array.isArray(targetRoles) ? targetRoles : [targetRoles]) : [],
        targetSpecificIds: targetSpecificIds ? (Array.isArray(targetSpecificIds) ? targetSpecificIds : [targetSpecificIds]) : [],
      }
    });
    return successResponse(res, updated, 'Announcement updated');
  } catch (e) { return errorResponse(res, 'Failed to update announcement', 500); }
};

const sendAnnouncement = async (req, res) => {
  try {
    const ann = await prisma.announcement.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!ann) return errorResponse(res, 'Announcement not found', 404);
    if (ann.status === 'Sent') return errorResponse(res, 'Announcement already sent', 400);

    const { specificSalespersonIds } = req.body;

    // Determine recipients
    let salespersons = [];
    if (ann.targetType === 'All') {
      salespersons = await prisma.salesperson.findMany({ where: { deletedAt: null, status: 'Active' }, select: { id: true } });
    } else if (ann.targetType === 'Specific' && ann.targetSpecificIds?.length) {
      salespersons = await prisma.salesperson.findMany({ where: { id: { in: ann.targetSpecificIds }, deletedAt: null, status: 'Active' }, select: { id: true } });
    } else if (ann.targetType === 'Region' && ann.targetRegions?.length) {
      salespersons = await prisma.salesperson.findMany({ where: { region: { in: ann.targetRegions }, deletedAt: null, status: 'Active' }, select: { id: true } });
    } else if (ann.targetType === 'Role' && ann.targetRoles?.length) {
      salespersons = await prisma.salesperson.findMany({ where: { jobRole: { in: ann.targetRoles }, deletedAt: null, status: 'Active' }, select: { id: true } });
    }

    if (!salespersons.length) return errorResponse(res, 'No recipients found', 400);

    // Create recipient records and update announcement
    await prisma.$transaction([
      prisma.announcement.update({ where: { id: ann.id }, data: { status: 'Sent', sentAt: new Date() } }),
      prisma.announcementRecipient.createMany({
        data: salespersons.map(sp => ({ announcementId: ann.id, salespersonId: sp.id })),
        skipDuplicates: true,
      }),
    ]);

    // Real-time delivery
    const io = req.app.get('io');
    if (io) {
      salespersons.forEach(sp => {
        io.to(`salesperson_${sp.id}`).emit('new_announcement', {
          announcementId: ann.id, title: ann.title, priority: ann.priority, message: ann.message,
        });
      });
    }

    await createAuditLog({ userId: req.user.id, userType: req.user.role, action: 'SEND_ANNOUNCEMENT', module: 'Announcements', recordId: ann.id, newValues: { recipientCount: salespersons.length }, ipAddress: req.ip });
    return successResponse(res, { recipientCount: salespersons.length }, 'Announcement sent');
  } catch (e) { return errorResponse(res, 'Failed to send announcement', 500); }
};

const getAnnouncementStats = async (req, res) => {
  try {
    const ann = await prisma.announcement.findFirst({
      where: { id: req.params.id },
      include: {
        _count: { select: { recipients: true, reads: true } },
        reads: { include: { salesperson: { select: { name: true, employeeId: true } } }, orderBy: { readAt: 'desc' } },
      },
    });
    if (!ann) return errorResponse(res, 'Announcement not found', 404);
    return successResponse(res, ann);
  } catch (e) { return errorResponse(res, 'Failed to fetch stats', 500); }
};

const deleteAnnouncement = async (req, res) => {
  try {
    await prisma.announcement.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: 'Deleted' } });
    return successResponse(res, null, 'Announcement deleted');
  } catch (e) { return errorResponse(res, 'Failed to delete announcement', 500); }
};

const getSalespersonAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const spId = req.user.id;

    const where = {
      deletedAt: null, status: 'Sent',
      recipients: { some: { salespersonId: spId } },
    };
    if (unreadOnly === 'true') where.reads = { none: { salespersonId: spId } };

    const [anns, total] = await Promise.all([
      prisma.announcement.findMany({
        where, skip, take: parseInt(limit),
        include: {
          reads: { where: { salespersonId: spId }, select: { readAt: true } },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.announcement.count({ where }),
    ]);

    const unreadCount = await prisma.announcement.count({
      where: { ...where, reads: { none: { salespersonId: spId } } },
    });

    const formatted = anns.map(a => ({
      ...a,
      isRead: a.reads.length > 0,
      readAt: a.reads[0]?.readAt || null,
    }));

    return res.json({ success: true, data: formatted, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }, unreadCount });
  } catch (e) { return errorResponse(res, 'Failed to fetch announcements', 500); }
};

const markAsRead = async (req, res) => {
  try {
    const spId = req.user.id;
    await prisma.announcementRead.upsert({
      where: { announcementId_salespersonId: { announcementId: req.params.id, salespersonId: spId } },
      update: { readAt: new Date() },
      create: { announcementId: req.params.id, salespersonId: spId },
    });

    // Notify admin of read receipt
    const io = req.app.get('io');
    if (io) io.to('admin').emit('announcement_read', { announcementId: req.params.id, salespersonId: spId });

    return successResponse(res, null, 'Marked as read');
  } catch (e) { return errorResponse(res, 'Failed to mark as read', 500); }
};

module.exports = { getAdminAnnouncements, createAnnouncement, updateAnnouncement, sendAnnouncement, getAnnouncementStats, deleteAnnouncement, getSalespersonAnnouncements, markAsRead };
