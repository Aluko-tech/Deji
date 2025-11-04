// src/services/contact.service.js
import prisma from '../config/prisma.js';
import { logAudit } from '../utils/auditLog.js';

/**
 * Create a contact
 */
export async function createContact(tenantId, userId, data) {
  const contact = await prisma.contact.create({
    data: {
      tenantId,
      ...data,
    },
  });

  await logAudit(userId, tenantId, 'CREATE_CONTACT', { contactId: contact.id });
  return contact;
}

/**
 * Get all contacts (with pagination + optional search)
 */
export async function getContacts(tenantId, { page = 1, limit = 10, search } = {}) {
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contact.count({ where }),
  ]);

  return { contacts, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Get contact by ID
 */
export async function getContactById(tenantId, id) {
  const contact = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!contact) throw new Error('Contact not found');
  return contact;
}

/**
 * Update a contact
 */
export async function updateContact(tenantId, userId, id, data) {
  const updated = await prisma.contact.updateMany({
    where: { id, tenantId },
    data,
  });
  if (updated.count === 0) throw new Error('Contact not found or access denied');

  await logAudit(userId, tenantId, 'UPDATE_CONTACT', { contactId: id });
  return prisma.contact.findFirst({ where: { id, tenantId } });
}

/**
 * Delete a contact
 */
export async function deleteContact(tenantId, userId, id) {
  const deleted = await prisma.contact.deleteMany({ where: { id, tenantId } });
  if (deleted.count === 0) throw new Error('Contact not found or already deleted');

  await logAudit(userId, tenantId, 'DELETE_CONTACT', { contactId: id });
  return { deleted: true };
}
