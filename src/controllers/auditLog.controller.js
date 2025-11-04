import { PrismaClient } from '@prisma/client';
import { logAudit, getAuditLogs as fetchAuditLogsService } from '../services/auditLog.service.js';


const prisma = new PrismaClient();

/**
 * Create an audit log entry
 */
export const createAuditLog = async (userId, tenantId, action, model, modelId = null, details = null) => {
  try {
    await prisma.logAudit.create({
      data: {
        userId,
        tenantId,
        action,
        model,
        modelId,
        details,
      },
    });
  } catch (err) {
    console.error('❌ Failed to create audit log:', err);
  }
};

/**
 * Get all audit logs (with optional filters and pagination)
 */
export const getAuditLogs = async (req, res) => {
  const { tenantId } = req.user;
  const {
    action,
    model,
    userId,
    page = 1,
    limit = 50,
    dateFrom,
    dateTo,
  } = req.query;

  // Build filter object
  const filters = { tenantId };

  if (action) filters.action = action;
  if (model) filters.model = model;
  if (userId) filters.userId = userId;

  if (dateFrom || dateTo) {
    filters.createdAt = {};
    if (dateFrom) filters.createdAt.gte = new Date(dateFrom);
    if (dateTo) filters.createdAt.lte = new Date(dateTo);
  }

  try {
    const { logs, total } = await fetchAuditLogsService(tenantId, {
      action,
      model,
      userId,
      fromDate: dateFrom,
      toDate: dateTo,
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      data: logs,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('❌ Failed to fetch audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
