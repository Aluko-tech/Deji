-- AlterTable
ALTER TABLE "public"."tenant_settings" ADD COLUMN     "invoiceDueDays" INTEGER,
ADD COLUMN     "invoiceNote" TEXT,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "website" TEXT;
