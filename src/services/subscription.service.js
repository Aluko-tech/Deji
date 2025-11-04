// src/services/subscription.service.js
import prisma from '../config/prisma.js';
import { logAudit } from './auditLog.service.js';

export const PLAN_LIMITS = {
  FREE: {
    invoicesPerMonth: 10,
    contactsMax: 500,
    whatsappEnabled: false,
    reportsAdvanced: false,
    usersMax: 1,
  },
  PRO: {
    invoicesPerMonth: 1000,
    contactsMax: 10000,
    whatsappEnabled: true,
    reportsAdvanced: true,
    usersMax: 10,
  },
  BUSINESS: {
    invoicesPerMonth: 100000,
    contactsMax: 1000000,
    whatsappEnabled: true,
    reportsAdvanced: true,
    usersMax: 1000,
  },
};

// simple period helper
export function getCurrentPeriodRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  return { start, end };
}

export async function getOrCreateSubscription(tenantId) {
  let sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!sub) {
    // default FREE, 30 days period from now
    const now = new Date();
    const next = new Date(now);
    next.setMonth(next.getMonth() + 1);
    sub = await prisma.subscription.create({
      data: {
        tenantId,
        plan: 'FREE',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: next,
      },
    });
  }
  return sub;
}

export async function getSubscription(tenantId) {
  return getOrCreateSubscription(tenantId);
}

export async function upgradeSubscription({ tenantId, plan, userId, metadata = null }) {
  const valid = ['FREE', 'PRO', 'BUSINESS'];
  if (!valid.includes(plan)) throw new Error('Invalid plan');

  const now = new Date();
  const next = new Date(now);
  next.setMonth(next.getMonth() + 1);

  const updated = await prisma.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      plan,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: next,
      metadata,
    },
    update: {
      plan,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: next,
      cancelAtPeriodEnd: false,
      metadata,
    },
  });

  await logAudit({
    tenantId,
    userId,
    action: 'SUBSCRIPTION_UPGRADE',
    model: 'Subscription',
    modelId: updated.id,
    details: { plan },
  });

  return updated;
}

export async function cancelSubscription({ tenantId, userId }) {
  const sub = await getOrCreateSubscription(tenantId);
  if (sub.status === 'CANCELED') return sub;

  const updated = await prisma.subscription.update({
    where: { tenantId },
    data: { cancelAtPeriodEnd: true },
  });

  await logAudit({
    tenantId,
    userId,
    action: 'SUBSCRIPTION_CANCEL_AT_PERIOD_END',
    model: 'Subscription',
    modelId: updated.id,
  });

  return updated;
}

export async function resumeSubscription({ tenantId, userId }) {
  const updated = await prisma.subscription.update({
    where: { tenantId },
    data: { cancelAtPeriodEnd: false, status: 'ACTIVE' },
  });

  await logAudit({
    tenantId,
    userId,
    action: 'SUBSCRIPTION_RESUME',
    model: 'Subscription',
    modelId: updated.id,
  });

  return updated;
}

/**
 * Compute usage dynamically (no extra tables yet)
 * - invoicesThisMonth
 * - contactsTotal
 * - usersTotal
 */
export async function getUsage(tenantId) {
  const { start, end } = getCurrentPeriodRange(new Date());

  const [invoicesThisMonth, contactsTotal, usersTotal] = await Promise.all([
    prisma.invoice.count({
      where: { tenantId, createdAt: { gte: start, lt: end } },
    }),
    prisma.contact.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
  ]);

  return { invoicesThisMonth, contactsTotal, usersTotal, periodStart: start, periodEnd: end };
}
