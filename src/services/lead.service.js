import prisma from '../config/prisma.js';

const ALLOWED_FIELDS = new Set([
  'name','email','phone','company','status','source','notes',
  'assignedTo','assignedById','createdBy','formId','formName','campaignName',
  'adSet','channel','leadType','priority','expectedValue',
  'followUpDate','lastContactedAt','convertedAt','lostReason',
]);

// Strip unknown fields, convert empty strings to null
function sanitize(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    out[k] = (typeof v === 'string' && v.trim() === '') ? null : v;
  }
  return out;
}

// Manual sources = customer care
const MANUAL_SOURCES = ['Manual', 'Walk-in', 'Referral', 'Returning Customer'];

export async function createLeadService(tenantId, data, createdByUser = null) {
  const { tags, marketerEmail, salesRepEmail, ...raw } = data;
  const leadData = sanitize(raw);

  // Auto-tag manual orders as Customer Care in notes
  const isManual = MANUAL_SOURCES.includes(leadData.source);
  if (isManual && !leadData.assignedTo) {
    leadData.assignedTo = 'customer_care';
  }

  // Store marketer/sales rep emails in campaignName/adSet if provided
  // (since schema has no dedicated email field, we use notes to append traceability)
  const traceLines = [];
  if (marketerEmail) traceLines.push(`marketer:${marketerEmail}`);
  if (salesRepEmail) traceLines.push(`sales_rep:${salesRepEmail}`);
  if (isManual)      traceLines.push(`entry:manual`);
  if (createdByUser) traceLines.push(`created_by:${createdByUser.email}`);

  if (traceLines.length) {
    leadData.notes = [leadData.notes, traceLines.join(' | ')].filter(Boolean).join('\n---\n');
  }

  // Always store the creator's userId for role-based access control
  if (createdByUser?.id) {
    leadData.createdBy = createdByUser.id;
  }

  return prisma.lead.create({
    data: {
      tenantId,
      ...leadData,
      ...(tags?.length ? { tags: { connect: tags.map(id => ({ id })) } } : {}),
    },
    include: { tags: true },
  });
}

// Roles that see only their own assigned leads
const ASSIGNED_ROLES = new Set(['staff', 'sales', 'sales_rep']);

export async function getLeadsService(tenantId, query = {}, requester = null) {
  const {
    page = 1, limit = 50,
    status, source, assignedTo,
    leadType, priority, channel,
    search, formId,
  } = query;

  // ── Role-based visibility ──────────────────────────────────────────────────
  // admin / manager / accountant / inventory → see everything
  // staff / sales / sales_rep               → only leads assigned to them
  // marketer                                → only leads they created
  let visibilityFilter = {};
  if (requester) {
    if (ASSIGNED_ROLES.has(requester.role)) {
      // assignedTo stores the rep's email (existing convention)
      visibilityFilter = { assignedTo: { equals: requester.email, mode: 'insensitive' } };
    } else if (requester.role === 'marketer') {
      visibilityFilter = { createdBy: requester.id };
    }
  }

  const where = {
    tenantId,
    ...visibilityFilter,
    ...(status     && { status }),
    ...(source     && { source }),
    // Allow explicit assignedTo override only if admin/manager (visibility already handles it otherwise)
    ...(assignedTo && !visibilityFilter.assignedTo && { assignedTo }),
    ...(leadType   && { leadType }),
    ...(priority   && { priority }),
    ...(channel    && { channel }),
    ...(formId     && { formId }),
    ...(search && {
      OR: [
        { name:         { contains: search, mode: 'insensitive' } },
        { email:        { contains: search, mode: 'insensitive' } },
        { phone:        { contains: search } },
        { company:      { contains: search, mode: 'insensitive' } },
        { campaignName: { contains: search, mode: 'insensitive' } },
        { notes:        { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip:    (Number(page) - 1) * Number(limit),
      take:    Number(limit),
      orderBy: { createdAt: 'desc' },
      include: { tags: true },
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
}

export async function getLeadByIdService(tenantId, id) {
  return prisma.lead.findFirst({
    where:   { id, tenantId },
    include: { tags: true },
  });
}

export async function updateLeadService(tenantId, id, data) {
  const { tags, marketerEmail, salesRepEmail, ...raw } = data;
  const leadData = sanitize(raw);

  return prisma.lead.update({
    where: { id },
    data: {
      ...leadData,
      ...(tags ? { tags: { set: tags.map(id => ({ id })) } } : {}),
    },
    include: { tags: true },
  });
}

export async function deleteLeadService(tenantId, id) {
  return prisma.lead.delete({ where: { id } });
}

export async function getLeadStatsService(tenantId) {
  const [
    total, byStatus, bySource, byLeadType,
    byPriority, byAssignee, byChannel,
    hotLeads, followUpDue,
  ] = await Promise.all([
    prisma.lead.count({ where: { tenantId } }),
    prisma.lead.groupBy({ by: ['status'],     where: { tenantId }, _count: true }),
    prisma.lead.groupBy({ by: ['source'],     where: { tenantId }, _count: true }),
    prisma.lead.groupBy({ by: ['leadType'],   where: { tenantId }, _count: true }),
    prisma.lead.groupBy({ by: ['priority'],   where: { tenantId }, _count: true }),
    prisma.lead.groupBy({ by: ['assignedTo'], where: { tenantId }, _count: true }),
    prisma.lead.groupBy({ by: ['channel'],    where: { tenantId }, _count: true }),
    prisma.lead.count({ where: { tenantId, leadType: 'hot' } }),
    prisma.lead.count({
      where: {
        tenantId,
        followUpDate: { lte: new Date() },
        status: { notIn: ['won', 'lost'] },
      },
    }),
  ]);

  return { total, byStatus, bySource, byLeadType, byPriority, byAssignee, byChannel, hotLeads, followUpDue };
}
