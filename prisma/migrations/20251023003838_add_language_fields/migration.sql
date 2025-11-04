-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "language" TEXT;
