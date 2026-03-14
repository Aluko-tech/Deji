/*
  Warnings:

  - A unique constraint covering the columns `[webhookToken]` on the table `tenant_settings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "webhookToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_webhookToken_key" ON "tenant_settings"("webhookToken");
