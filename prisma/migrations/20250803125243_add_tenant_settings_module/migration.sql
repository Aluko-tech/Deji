-- CreateTable
CREATE TABLE "public"."tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "currency" TEXT,
    "language" TEXT,
    "invoicePrefix" TEXT,
    "invoiceStart" INTEGER,
    "taxRate" DOUBLE PRECISION,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyByWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "phoneNumber" TEXT,
    "emailAddress" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "public"."tenant_settings"("tenantId");

-- AddForeignKey
ALTER TABLE "public"."tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
