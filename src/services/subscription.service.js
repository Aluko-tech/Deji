import prisma from '../config/prisma.js';
import { logAudit } from './auditLog.service.js';

export const PLAN_LIMITS = {
  FREE: {
    invoicesPerMonth:10, contactsMax:50, leadsMax:50, productsMax:20,
    posTransactions:30, whatsappMessages:50, warehousesMax:1,
    formsMax:1, landingPagesMax:1, usersMax:2, reportsHistoryDays:7,
    whatsappEnabled:false, reportsAdvanced:false, aiInsights:false,
    customBranding:false, apiAccess:false, bulkImport:false,
    whiteLabel:false, auditLogs:false, customFields:false, productVariants:false,
  },
  STARTER: {
    invoicesPerMonth:50, contactsMax:500, leadsMax:300, productsMax:100,
    posTransactions:200, whatsappMessages:500, warehousesMax:10,
    formsMax:10, landingPagesMax:2, usersMax:5, reportsHistoryDays:30,
    whatsappEnabled:true, reportsAdvanced:false, aiInsights:false,
    customBranding:false, apiAccess:false, bulkImport:false,
    whiteLabel:false, auditLogs:true, customFields:false, productVariants:true,
  },
  PRO: {
    invoicesPerMonth:500, contactsMax:10000, leadsMax:5000, productsMax:1000,
    posTransactions:999999, whatsappMessages:5000, warehousesMax:25,
    formsMax:25, landingPagesMax:10, usersMax:20, reportsHistoryDays:365,
    whatsappEnabled:true, reportsAdvanced:true, aiInsights:true,
    customBranding:true, apiAccess:true, bulkImport:true,
    whiteLabel:false, auditLogs:true, customFields:true, productVariants:true,
  },
  BUSINESS: {
    invoicesPerMonth:2000, contactsMax:50000, leadsMax:20000, productsMax:5000,
    posTransactions:999999, whatsappMessages:20000, warehousesMax:50,
    formsMax:999999, landingPagesMax:999999, usersMax:50, reportsHistoryDays:1095,
    whatsappEnabled:true, reportsAdvanced:true, aiInsights:true,
    customBranding:true, apiAccess:true, bulkImport:true,
    whiteLabel:true, auditLogs:true, customFields:true, productVariants:true,
  },
  ENTERPRISE: {
    invoicesPerMonth:999999, contactsMax:999999, leadsMax:999999, productsMax:999999,
    posTransactions:999999, whatsappMessages:999999, warehousesMax:999999,
    formsMax:999999, landingPagesMax:999999, usersMax:999999, reportsHistoryDays:9999,
    whatsappEnabled:true, reportsAdvanced:true, aiInsights:true,
    customBranding:true, apiAccess:true, bulkImport:true,
    whiteLabel:true, auditLogs:true, customFields:true, productVariants:true,
  },
};

// TRIAL plan = unlimited access (same as ENTERPRISE) for 30 days
export const TRIAL_LIMITS = { ...PLAN_LIMITS.ENTERPRISE };

export const PLAN_PRICES = {
  FREE:       { monthly: 0,      annual: 0 },
  STARTER:    { monthly: 18500,  annual: 18500 * 10 },  // 2 months free
  PRO:        { monthly: 37500,  annual: 37500 * 10 },
  BUSINESS:   { monthly: 78500,  annual: 78500 * 10 },
  ENTERPRISE: { monthly: 150000, annual: 150000 * 10 },
};

export function getCurrentPeriodRange(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  return { start, end };
}

export async function getOrCreateSubscription(tenantId) {
  let sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!sub) {
    const now      = new Date();
    const trialEnd = new Date(now); trialEnd.setDate(trialEnd.getDate() + 30);
    const periodEnd = new Date(trialEnd);
    sub = await prisma.subscription.create({
      data: {
        tenantId,
        plan:               'FREE',
        status:             'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd:   periodEnd,
        trialEndsAt:        trialEnd,
        trialUsed:          false,
        billingCycle:       'monthly',
      },
    });
  }
  // Auto-expire trial if it's past trialEndsAt
  if (sub.trialEndsAt && new Date() > new Date(sub.trialEndsAt) && !sub.trialUsed) {
    sub = await prisma.subscription.update({
      where: { tenantId },
      data:  { trialUsed: true },
    });
  }
  return sub;
}

export async function getSubscription(tenantId) {
  return getOrCreateSubscription(tenantId);
}

// Returns effective limits — TRIAL_LIMITS during trial, else plan limits
export async function getEffectiveLimits(tenantId) {
  const sub = await getOrCreateSubscription(tenantId);
  const inTrial = sub.trialEndsAt && new Date() <= new Date(sub.trialEndsAt) && !sub.trialUsed;
  if (inTrial) return { ...TRIAL_LIMITS, _inTrial: true, _trialEndsAt: sub.trialEndsAt };
  return { ...( PLAN_LIMITS[sub.plan] || PLAN_LIMITS.FREE ), _inTrial: false };
}

export async function upgradeSubscription({ tenantId, plan, userId, billingCycle = 'monthly', metadata = null }) {
  const valid = ['FREE','STARTER','PRO','BUSINESS','ENTERPRISE'];
  if (!valid.includes(plan)) throw new Error('Invalid plan: ' + plan);
  const now  = new Date();
  const months = billingCycle === 'annual' ? 12 : 1;
  const end  = new Date(now); end.setMonth(end.getMonth() + months);
  const updated = await prisma.subscription.upsert({
    where:  { tenantId },
    create: {
      tenantId, plan, status:'ACTIVE', billingCycle,
      currentPeriodStart: now, currentPeriodEnd: end,
      trialUsed: true, metadata,
    },
    update: {
      plan, status:'ACTIVE', billingCycle,
      currentPeriodStart: now, currentPeriodEnd: end,
      cancelAtPeriodEnd: false, trialUsed: true, metadata,
    },
  });
  await logAudit({ tenantId, userId, action:'SUBSCRIPTION_UPGRADE', model:'Subscription', modelId:updated.id, details:{ plan, billingCycle, amount: PLAN_PRICES[plan]?.[billingCycle] } });
  return updated;
}

export async function cancelSubscription({ tenantId, userId }) {
  const sub = await getOrCreateSubscription(tenantId);
  if (sub.status === 'CANCELED') return sub;
  const updated = await prisma.subscription.update({ where:{ tenantId }, data:{ cancelAtPeriodEnd:true } });
  await logAudit({ tenantId, userId, action:'SUBSCRIPTION_CANCEL_AT_PERIOD_END', model:'Subscription', modelId:updated.id });
  return updated;
}

export async function resumeSubscription({ tenantId, userId }) {
  const updated = await prisma.subscription.update({ where:{ tenantId }, data:{ cancelAtPeriodEnd:false, status:'ACTIVE' } });
  await logAudit({ tenantId, userId, action:'SUBSCRIPTION_RESUME', model:'Subscription', modelId:updated.id });
  return updated;
}

export async function getUsage(tenantId) {
  const { start, end } = getCurrentPeriodRange(new Date());
  const [invoicesThisMonth, contactsTotal, usersTotal, leadsTotal, productsTotal, warehousesTotal, formsTotal] = await Promise.all([
    prisma.invoice.count({ where:{ tenantId, createdAt:{ gte:start, lt:end } } }),
    prisma.contact.count({ where:{ tenantId } }),
    prisma.user.count({   where:{ tenantId } }),
    prisma.lead.count({   where:{ tenantId } }),
    prisma.product.count({ where:{ tenantId } }),
    prisma.warehouse.count({ where:{ tenantId } }),
    prisma.form.count({   where:{ tenantId } }),
  ]);
  return { invoicesThisMonth, contactsTotal, usersTotal, leadsTotal, productsTotal, warehousesTotal, formsTotal, periodStart:start, periodEnd:end };
}
