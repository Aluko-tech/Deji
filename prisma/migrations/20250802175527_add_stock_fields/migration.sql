/*
  Warnings:

  - Added the required column `stockQuantity` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "lowStockAlert" INTEGER,
ADD COLUMN     "stockQuantity" INTEGER NOT NULL;
