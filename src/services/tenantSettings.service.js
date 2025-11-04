import prisma from '../config/prisma.js';

const DEFAULT_SETTINGS = {
  currency: 'USD',
  language: 'en',
  timezone: 'UTC',
};

export async function getTenantSettings(tenantId) {
  let settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  if (!settings) {
    settings = await prisma.tenantSettings.create({
      data: { tenantId },
    });
  }
  return settings;
}

export async function updateTenantSettings(tenantId, data) {
  const cleanedData = {
    businessName: data.businessName ?? undefined,
    logoUrl: data.logoUrl ?? undefined,
    primaryColor: data.primaryColor ?? undefined,
    currency: data.currency ?? undefined,
    language: data.language ?? undefined,
    timezone: data.timezone ?? undefined,
    invoicePrefix: data.invoicePrefix ?? undefined,
    invoiceStart: data.invoiceStart ?? undefined,
    invoiceNote: data.invoiceNote ?? undefined,
    invoiceDueDays: data.invoiceDueDays ?? undefined,
    taxRate: data.taxRate ?? undefined,
    notifyByEmail: data.notifyByEmail ?? undefined,
    notifyByWhatsApp: data.notifyByWhatsApp ?? undefined,
    phoneNumber: data.phoneNumber ?? undefined,
    emailAddress: data.emailAddress ?? undefined,
    address: data.address ?? undefined,
    website: data.website ?? undefined,
  };

  return prisma.tenantSettings.upsert({
    where: { tenantId },
    update: cleanedData,
    create: { tenantId, ...cleanedData },
  });
}
