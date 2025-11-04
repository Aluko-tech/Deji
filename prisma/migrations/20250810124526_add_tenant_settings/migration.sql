-- AlterTable
ALTER TABLE "public"."tenant_settings" ALTER COLUMN "primaryColor" SET DEFAULT '#000000',
ALTER COLUMN "currency" SET DEFAULT 'NGN',
ALTER COLUMN "language" SET DEFAULT 'en',
ALTER COLUMN "invoicePrefix" SET DEFAULT 'INV-',
ALTER COLUMN "invoiceStart" SET DEFAULT 1000,
ALTER COLUMN "taxRate" SET DEFAULT 0.0,
ALTER COLUMN "invoiceDueDays" SET DEFAULT 30,
ALTER COLUMN "timezone" SET DEFAULT 'Africa/Lagos';
