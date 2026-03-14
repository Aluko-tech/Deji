import prisma from '../db.js';

/**
 * Get all sales reps who are currently ON DUTY for a tenant.
 * onDuty is stored in User.metadata as { onDuty: true }
 */
export async function getOnDutyReps(tenantId) {
  const reps = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ['sales', 'staff', 'admin', 'manager'] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      metadata: true,
    },
  });
  return reps.filter(r => {
    try {
      const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {});
      return meta.onDuty === true;
    } catch { return false; }
  });
}

/**
 * Toggle a rep's onDuty status. Only callable by admin.
 */
export async function toggleRepDuty(tenantId, userId, onDuty) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) throw new Error('User not found');
  const currentMeta = typeof user.metadata === 'string'
    ? JSON.parse(user.metadata || '{}')
    : (user.metadata || {});
  const newMeta = { ...currentMeta, onDuty: Boolean(onDuty) };
  return prisma.user.update({
    where: { id: userId },
    data: { metadata: JSON.stringify(newMeta) },
  });
}

/**
 * Round-robin assignment.
 * Tracks last assigned index in tenant settings metadata.
 */
export async function autoAssignRep(tenantId) {
  const onDutyReps = await getOnDutyReps(tenantId);
  if (onDutyReps.length === 0) return null; // will be queued

  // Get or init the round-robin counter from tenant settings
  let settings = await prisma.tenantSettings.findFirst({ where: { tenantId } });
  let meta = {};
  try {
    meta = typeof settings?.metadata === 'string'
      ? JSON.parse(settings.metadata || '{}')
      : (settings?.metadata || {});
  } catch { meta = {}; }

  const lastIndex = typeof meta.rrIndex === 'number' ? meta.rrIndex : -1;
  const nextIndex = (lastIndex + 1) % onDutyReps.length;
  const assignedRep = onDutyReps[nextIndex];

  // Save updated index
  const newMeta = { ...meta, rrIndex: nextIndex };
  if (settings) {
    await prisma.tenantSettings.update({
      where: { id: settings.id },
      data: { metadata: JSON.stringify(newMeta) },
    });
  }

  return assignedRep;
}

/**
 * Create a lead from a webhook payload (normalised).
 * If no rep is on duty, lead is created with status "queued".
 */
export async function createLeadFromWebhook(tenantId, data) {
  const rep = await autoAssignRep(tenantId);

  const lead = await prisma.lead.create({
    data: {
      tenantId,
      name:         data.name         || data.full_name || data.fullName || 'Unknown',
      email:        data.email        || null,
      phone:        data.phone        || data.phone_number || null,
      company:      data.company      || null,
      source:       data.source       || 'webhook',
      channel:      data.channel      || data.platform || data.source || 'webhook',
      campaignName: data.campaignName || data.campaign_name || data.ad_name || null,
      adSet:        data.adSet        || data.ad_set_name || null,
      formName:     data.formName     || data.form_name || null,
      leadType:     'warm',
      priority:     'medium',
      status:       rep ? 'new' : 'new',
      assignedTo:   rep ? `${rep.firstName} ${rep.lastName}`.trim() : null,
      notes:        rep ? null : '⏳ Queued — no rep was on duty at time of capture',
    },
  });

  return { lead, assignedTo: rep };
}