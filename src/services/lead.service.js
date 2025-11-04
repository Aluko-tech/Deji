import prisma from '../config/prisma.js';

export async function createLeadService(tenantId, data) {
  return prisma.lead.create({ data: { tenantId, ...data } });
}

export async function getLeadsService(tenantId, query = {}) {
  const { page = 1, limit = 10 } = query;
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: { tenantId },
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lead.count({ where: { tenantId } }),
  ]);

  return { leads, total, page: Number(page), totalPages: Math.ceil(total / limit) };
}

export async function getLeadByIdService(tenantId, id) {
  return prisma.lead.findFirst({ where: { id, tenantId } });
}

export async function updateLeadService(tenantId, id, data) {
  return prisma.lead.update({
    where: { id, tenantId },
    data,
  });
}

export async function deleteLeadService(tenantId, id) {
  return prisma.lead.delete({ where: { id, tenantId } });
}
