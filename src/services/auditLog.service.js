// src/services/auditLog.service.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Create an audit log entry
 */
export async function logAudit({ tenantId, userId, action, model, modelId, details }) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        model,
        modelId,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
      },
    });
  } catch (error) {
    console.error('Failed to save audit log:', error);
  }
}

/**
 * Fetch audit logs for a tenant
 */
export async function getAuditLogs(tenantId, filters = {}, options = {}) {
  const { skip = 0, take = 50, userId, action, model } = filters;

  const where = { tenantId };
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (model) where.model = model;

  try {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: Number(skip),
      take: Number(take),
    });

    const total = await prisma.auditLog.count({ where });
    return { data: logs, total };
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    throw new Error('Failed to fetch audit logs');
  }
}
