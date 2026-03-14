-- DropIndex
DROP INDEX "public"."Lead_email_key";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "adSet" TEXT,
ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "campaignName" TEXT,
ADD COLUMN     "channel" TEXT,
ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "expectedValue" DOUBLE PRECISION,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "formId" TEXT,
ADD COLUMN     "formName" TEXT,
ADD COLUMN     "lastContactedAt" TIMESTAMP(3),
ADD COLUMN     "leadType" TEXT DEFAULT 'warm',
ADD COLUMN     "lostReason" TEXT,
ADD COLUMN     "priority" TEXT DEFAULT 'medium',
ALTER COLUMN "status" SET DEFAULT 'new';
