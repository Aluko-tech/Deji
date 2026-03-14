/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductType" ADD VALUE 'bundle';
ALTER TYPE "ProductType" ADD VALUE 'combo';

-- DropIndex
DROP INDEX "public"."Contact_email_key";

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "address" TEXT,
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "lastPurchaseAt" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "totalSpend" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "type" TEXT DEFAULT 'customer',
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "compareAtPrice" DOUBLE PRECISION,
ADD COLUMN     "costPrice" DOUBLE PRECISION,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "type" SET DEFAULT 'product';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "inviteExpiry" TIMESTAMP(3),
ADD COLUMN     "invitePending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "permissions" JSONB,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "verifyExpiry" TIMESTAMP(3),
ADD COLUMN     "verifyToken" TEXT,
ALTER COLUMN "role" SET DEFAULT 'staff';

-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolumeDiscount" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolumeDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplementaryProduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "complementId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "ComplementaryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VolumeDiscount" ADD CONSTRAINT "VolumeDiscount_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementaryProduct" ADD CONSTRAINT "ComplementaryProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementaryProduct" ADD CONSTRAINT "ComplementaryProduct_complementId_fkey" FOREIGN KEY ("complementId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
