-- AlterTable
ALTER TABLE "public"."Invoice" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN';

-- AlterTable
ALTER TABLE "public"."Product" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN';
