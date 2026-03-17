import prisma from '../config/prisma.js';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT WAREHOUSE HELPER
// Every tenant has one "Main Warehouse" (type=local, country=Nigeria).
// It is created automatically on first use — no manual setup required.
// All products added and all stock adjustments flow here by default.
// Transfers to other warehouses are done manually from the Warehousing page.
// ─────────────────────────────────────────────────────────────────────────────
async function getOrCreateDefaultWarehouse(tenantId, tx = prisma) {
  // Always prefer explicitly flagged default warehouse
  let wh = await tx.warehouse.findFirst({
    where: { tenantId, isDefault: true, isActive: true },
  });

  if (!wh) {
    // Create a proper Main Warehouse and flag it as default
    wh = await tx.warehouse.create({
      data: {
        tenantId,
        name:      'Main Warehouse',
        code:      'MAIN',
        type:      'local',
        country:   'Nigeria',
        city:      'Lagos',
        currency:  'NGN',
        isActive:  true,
        isDefault: true,
        notes:     'Default warehouse — all new stock lands here first',
      },
    });
  }

  return wh;
}

// Upsert stock into a warehouse (add qty to existing or create new record)
async function upsertWarehouseStock(tenantId, warehouseId, productId, quantity, tx = prisma) {
  await tx.warehouseStock.upsert({
    where:  { warehouseId_productId: { warehouseId, productId } },
    update: { quantity: { increment: quantity } },
    create: { tenantId, warehouseId, productId, quantity: Math.max(0, quantity) },
  });
}

// Extract variants array from customFields or top-level variants key
function extractVariants(data) {
  const top = data.variants;
  const cf  = data.customFields?.variants;
  // Accept either location; prefer top-level if present
  if (Array.isArray(top) && top.length) return top;
  if (Array.isArray(cf)  && cf.length)  return cf;
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
export async function createProductService(tenantId, data) {
  const { volumeDiscounts, bundleItems, complementaryProducts, variants: _v, ...productData } = data;
  const variants = extractVariants(data);

  const result = await prisma.$transaction(async (tx) => {
    // 1 — Create the product
    const product = await tx.product.create({
      data: { ...productData, tenantId },
    });

    // 2 — Add volume discounts
    if (volumeDiscounts?.length) {
      await tx.volumeDiscount.createMany({
        data: volumeDiscounts.map(d => ({ ...d, productId: product.id, tenantId })),
      });
    }

    // 3 — Add bundle items
    if (bundleItems?.length) {
      await tx.bundleItem.createMany({
        data: bundleItems.map(b => ({
          productId: b.productId, quantity: b.quantity, bundleId: product.id, tenantId,
        })),
      });
    }

    // 4 — Add complementary products
    if (complementaryProducts?.length) {
      await tx.complementaryProduct.createMany({
        data: complementaryProducts.map(c => ({ productId: product.id, complementId: c.id, tenantId })),
      });
    }

    // 5 — Create ProductVariant records (proper DB table)
    if (variants.length) {
      await tx.productVariant.createMany({
        data: variants.map((v, i) => ({
          tenantId,
          productId:    product.id,
          name:         v.name || `Variant ${i + 1}`,
          sku:          v.sku  || null,
          costPrice:    Number(v.costPrice)    || null,
          sellingPrice: Number(v.sellingPrice) || null,
          stock:        Number(v.stock)        || 0,
          imageUrl:     v.imageUrl             || null,
          sortOrder:    i,
        })),
      });
    }

   // 6 - Always create a WarehouseStock entry in Main Warehouse for non-service products
    const variantStock = variants.length
      ? variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
      : 0;
    const initialStock = variantStock > 0 ? variantStock : (Number(productData.stock) || 0);

    if (product.type !== 'service') {
      const defaultWH = await getOrCreateDefaultWarehouse(tenantId, tx);
      await upsertWarehouseStock(tenantId, defaultWH.id, product.id, initialStock, tx);
    }

    return product;
  });

  return getProductByIdService(tenantId, result.id);
}
// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────
export async function getProductsService(tenantId, query = {}) {
  const { search, category, type, stockStatus, skip = 0, take = 100 } = query;

  const where = {
    tenantId,
    ...(search      && { name: { contains: search, mode: 'insensitive' } }),
    ...(category    && { category }),
    ...(type        && { type }),
    ...(stockStatus === 'low' && { stock: { gt: 0, lte: 5 } }),
    ...(stockStatus === 'out' && { stock: 0 }),
    ...(stockStatus === 'in'  && { stock: { gt: 0 } }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip:    Number(skip),
      take:    Number(take),
      orderBy: { createdAt: 'desc' },
      include: {
        volumeDiscounts:   true,
        bundleItems:       { include: { product: { select: { id:true, name:true, stock:true, price:true } } } },
        complementaryFrom: { include: { complement: { select: { id:true, name:true, price:true, imageUrl:true } } } },
        warehouseStocks:   { include: { warehouse: { select: { id:true, name:true, country:true, city:true } } } },
        variants:          { orderBy: { sortOrder: 'asc' }, where: { isActive: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET PRODUCT BY ID
// ─────────────────────────────────────────────────────────────────────────────
export async function getProductByIdService(tenantId, id) {
  return prisma.product.findFirst({
    where: { id, tenantId },
    include: {
      volumeDiscounts:   { orderBy: { minQty: 'asc' } },
      bundleItems:       { include: { product: { select: { id:true, name:true, stock:true, price:true, imageUrl:true } } } },
      complementaryFrom: { include: { complement: { select: { id:true, name:true, price:true, imageUrl:true } } } },
      stockAuditLogs:    { orderBy: { createdAt: 'desc' }, take: 20 },
      warehouseStocks:   { include: { warehouse: { select: { id:true, name:true, country:true, city:true, type:true } } } },
      variants:          { orderBy: { sortOrder: 'asc' }, where: { isActive: true } },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
export async function updateProductService(tenantId, id, data) {
  const { volumeDiscounts, bundleItems, complementaryProducts, variants: _v, ...productData } = data;
  const variants = extractVariants(data);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Product not found');

    await tx.product.update({ where: { id }, data: productData });

    // If stock is being directly updated, sync Main Warehouse
    if (productData.stock !== undefined && existing.type !== 'service') {
      const newStock  = Number(productData.stock);
      const oldStock  = existing.stock;
      const diff      = newStock - oldStock;

      if (diff !== 0) {
        const defaultWH = await getOrCreateDefaultWarehouse(tenantId, tx);
        const whStock   = await tx.warehouseStock.findUnique({
          where: { warehouseId_productId: { warehouseId: defaultWH.id, productId: id } },
        });
        const currentWhQty = whStock?.quantity ?? 0;
        const newWhQty     = Math.max(0, currentWhQty + diff);

        await tx.warehouseStock.upsert({
          where:  { warehouseId_productId: { warehouseId: defaultWH.id, productId: id } },
          update: { quantity: newWhQty },
          create: { tenantId, warehouseId: defaultWH.id, productId: id, quantity: newWhQty },
        });
      }
    }

    // Replace volume discounts
    if (volumeDiscounts !== undefined) {
      await tx.volumeDiscount.deleteMany({ where: { productId: id } });
      if (volumeDiscounts.length) {
        await tx.volumeDiscount.createMany({
          data: volumeDiscounts.map(d => ({ minQty: d.minQty, discountPct: d.discountPct, productId: id, tenantId })),
        });
      }
    }

    // Replace bundle items
    if (bundleItems !== undefined) {
      await tx.bundleItem.deleteMany({ where: { bundleId: id } });
      if (bundleItems.length) {
        await tx.bundleItem.createMany({
          data: bundleItems.map(b => ({ productId: b.productId, quantity: b.quantity, bundleId: id, tenantId })),
        });
      }
    }

    // Replace complementary products
    if (complementaryProducts !== undefined) {
      await tx.complementaryProduct.deleteMany({ where: { productId: id } });
      if (complementaryProducts.length) {
        await tx.complementaryProduct.createMany({
          data: complementaryProducts.map(c => ({ productId: id, complementId: c.id, tenantId })),
        });
      }
    }

    // Replace ProductVariant records when variants array is provided in the payload
    const hasVariantData = Array.isArray(data.variants)
      || Array.isArray(data.customFields?.variants);
    if (hasVariantData) {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (variants.length) {
        await tx.productVariant.createMany({
          data: variants.map((v, i) => ({
            tenantId,
            productId:    id,
            name:         v.name || `Variant ${i + 1}`,
            sku:          v.sku  || null,
            costPrice:    Number(v.costPrice)    || null,
            sellingPrice: Number(v.sellingPrice) || null,
            stock:        Number(v.stock)        || 0,
            imageUrl:     v.imageUrl             || null,
            sortOrder:    i,
          })),
        });
      }
    }
  });

  return getProductByIdService(tenantId, id);
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE PRODUCT
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteProductService(tenantId, id) {
  // Verify ownership
  const product = await prisma.product.findFirst({ where: { id, tenantId } });
  if (!product) throw new Error('Product not found');

  // Delete all related records first (order matters for FK constraints)
  await prisma.stockAuditLog.deleteMany({ where: { productId: id } });
  await prisma.lowStockAlert.deleteMany({ where: { productId: id } });
  await prisma.productVariant.deleteMany({ where: { productId: id } });
  await prisma.bundleItem.deleteMany({ where: { OR: [{ bundleId: id }, { productId: id }] } });
  await prisma.complementaryProduct.deleteMany({ where: { OR: [{ productId: id }, { complementId: id }] } });
  await prisma.volumeDiscount.deleteMany({ where: { productId: id } });
  await prisma.warehouseStock.deleteMany({ where: { productId: id } });
  return prisma.product.delete({ where: { id } });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADJUST STOCK  — always syncs Main Warehouse
// ─────────────────────────────────────────────────────────────────────────────
export async function adjustStockService(tenantId, productId, quantity, reason, userId) {
  const product = await prisma.product.findFirst({ where: { id: productId, tenantId } });
  if (!product) throw new Error('Product not found');

  const newStock = Math.max(0, product.stock + quantity);

  await prisma.$transaction(async (tx) => {
    // 1 — Update global product stock
    await tx.product.update({ where: { id: productId }, data: { stock: newStock } });

    // 2 — Sync Main Warehouse stock
    if (product.type !== 'service') {
      const defaultWH    = await getOrCreateDefaultWarehouse(tenantId, tx);
      const whStock      = await tx.warehouseStock.findUnique({
        where: { warehouseId_productId: { warehouseId: defaultWH.id, productId } },
      });
      const currentWhQty = whStock?.quantity ?? 0;
      const newWhQty     = Math.max(0, currentWhQty + quantity);

      await tx.warehouseStock.upsert({
        where:  { warehouseId_productId: { warehouseId: defaultWH.id, productId } },
        update: { quantity: newWhQty },
        create: { tenantId, warehouseId: defaultWH.id, productId, quantity: newWhQty },
      });
    }

    // 3 — Audit log
    await tx.stockAuditLog.create({
      data: {
        tenantId,
        productId,
        changeType:  quantity > 0 ? 'restock' : 'deduct',
        oldValue:    product.stock,
        newValue:    newStock,
        triggeredBy: userId || 'manual',
      },
    });

    // 4 — Low stock alert
    if (newStock <= product.lowStockThreshold && newStock > 0) {
      await tx.lowStockAlert.create({
        data: {
          tenantId,
          productId,
          message: `${product.name} is low on stock (${newStock} remaining)`,
          sentVia: 'system',
        },
      });
    }
  });

  return { ...product, stock: newStock };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUCT STOCK FOR ORDER  (used by POS / invoice)
// ─────────────────────────────────────────────────────────────────────────────
export async function deductStockForOrder(tenantId, lineItems, orderId, trigger = 'order_placed', userId = 'system') {
  const results = [];

  for (const item of lineItems) {
    const product = await prisma.product.findFirst({ where: { id: item.productId, tenantId } });
    if (!product || !product.trackStock) continue;

    if (product.type === 'bundle' || product.type === 'combo') {
      const bundleItems = await prisma.bundleItem.findMany({
        where:   { bundleId: product.id },
        include: { product: true },
      });
      for (const bi of bundleItems) {
        const deductQty = bi.quantity * item.quantity;
        await adjustStockService(tenantId, bi.productId, -deductQty, `Bundle sale: ${product.name} (Order ${orderId})`, userId);
      }
    } else {
      await adjustStockService(tenantId, item.productId, -item.quantity, `${trigger}: Order ${orderId}`, userId);
    }

    results.push({ productId: item.productId, deducted: item.quantity });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
export function getVolumeDiscount(volumeDiscounts, quantity) {
  if (!volumeDiscounts?.length) return 0;
  const applicable = volumeDiscounts
    .filter(d => quantity >= d.minQty)
    .sort((a, b) => b.minQty - a.minQty);
  return applicable[0]?.discountPct || 0;
}

export async function getInventoryStatsService(tenantId) {
  const LOW_STOCK_THRESHOLD = 5;
  const [total, outOfStock, lowStock, totalValue, categories] = await Promise.all([
    prisma.product.count({ where: { tenantId, type: 'product' } }),
    prisma.product.count({ where: { tenantId, stock: 0, type: 'product' } }),
    prisma.product.count({ where: { tenantId, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD }, type: 'product' } }),
    prisma.product.aggregate({ where: { tenantId, type: 'product' }, _sum: { stock: true } }),
    prisma.product.groupBy({ by: ['category'], where: { tenantId }, _count: true }),
  ]);

  return { total, outOfStock, lowStock, categories };
}