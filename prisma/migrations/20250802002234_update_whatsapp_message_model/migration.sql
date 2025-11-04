-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUTGOING', 'INCOMING');

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN     "direction" "MessageDirection" NOT NULL DEFAULT 'OUTGOING',
ADD COLUMN     "error" TEXT,
ADD COLUMN     "messageId" TEXT,
ADD COLUMN     "receivedAt" TIMESTAMP(3);
