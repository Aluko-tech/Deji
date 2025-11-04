/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,email]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "refreshToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_tenantId_email_key" ON "public"."Lead"("tenantId", "email");
