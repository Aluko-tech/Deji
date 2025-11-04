import prisma from '../config/prisma.js';

export async function listCustomFields(tenantId, entity) {
  return prisma.customField.findMany({
    where: { tenantId, entity },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getCustomFieldById(tenantId, id) {
  return prisma.customField.findFirst({
    where: { tenantId, id },
  });
}

export async function createCustomField(tenantId, entity, data) {
  return prisma.customField.create({
    data: {
      tenantId,
      entity,
      ...data, // expects: name, type, required, options, defaultValue
    },
  });
}

export async function updateCustomField(tenantId, id, data) {
  return prisma.customField.updateMany({
    where: { tenantId, id },
    data,
  });
}

export async function deleteCustomField(tenantId, id) {
  return prisma.customField.deleteMany({
    where: { tenantId, id },
  });
}

export async function getCustomFieldValues(tenantId, entityId) {
  // Return all custom field values for a record + the custom field metadata
  return prisma.customFieldValue.findMany({
    where: { entityId },
    include: {
      customField: true,
    },
  });
}

export async function upsertCustomFieldValue(tenantId, entityId, customFieldId, value) {
  // You might want to validate tenant ownership via joins in a real system for security

  return prisma.customFieldValue.upsert({
    where: {
      customFieldId_entityId: {
        customFieldId,
        entityId,
      },
    },
    update: { value },
    create: {
      customFieldId,
      entityId,
      value,
    },
  });
}
