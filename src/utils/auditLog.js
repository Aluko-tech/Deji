// src/utils/auditLog.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Log an audit action with contextual model info
 * @param {Object} params
 * @param {string} params.tenantId - Tenant ID
 * @param {string} [params.userId] - Optional user ID
 * @param {string} params.action - Action name e.g. CREATE, UPDATE, DELETE
 * @param {string} params.model - Model name e.g. Contact, Product
 * @param {string} [params.modelId] - ID of affected record
 * @param {object} [params.details] - JSON details or snapshot
 */
export async function logAudit({
  tenantId,
  userId = null,
  action,
  model,
  modelId = null,
  details = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        model,
        modelId,
        details,
      },
    });
    console.log(`✅ Audit logged: ${action} on ${model} (${modelId ?? 'N/A'})`);
  } catch (error) {
    console.error('❌ Audit logging failed:', error);
  }
}
