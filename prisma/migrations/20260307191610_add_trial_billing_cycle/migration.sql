-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "trialUsed" BOOLEAN NOT NULL DEFAULT false;
