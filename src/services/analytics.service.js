import prisma from '../config/prisma.js';

// ─── Shared aggregation helper ───────────────────────────────────────────────
// Fetches all PAID invoice line items in a date range and aggregates by product.
// Used by both revenue-by-product and cogs-by-product so we only query once.
async function aggregateLineItems(tenantId, start, end) {
  const lineItems = await prisma.lineItem.findMany({
    where: {
      invoice: {
        tenantId,
        status:    'PAID',
        createdAt: { gte: start, lte: end },
      },
    },
    include: {
      product: { select: { id: true, name: true, sku: true, costPrice: true } },
    },
  });

  const byProduct = new Map();
  for (const item of lineItems) {
    const key = item.productId || `desc:${item.description}`;
    if (!byProduct.has(key)) {
      byProduct.set(key, {
        productId:    item.productId,
        name:         item.product?.name || item.description,
        sku:          item.product?.sku  || null,
        revenue:      0,
        quantitySold: 0,
        cogs:         0,
      });
    }
    const row = byProduct.get(key);
    row.revenue      += item.total;
    row.quantitySold += item.quantity;
    row.cogs         += item.quantity * (item.product?.costPrice || 0);
  }

  return Array.from(byProduct.values()).map(r => ({
    ...r,
    grossProfit: r.revenue - r.cogs,
    margin:      r.revenue > 0 ? (r.revenue - r.cogs) / r.revenue : 0,
  }));
}

// ─── Revenue by product ──────────────────────────────────────────────────────
export async function revenueByProduct({ tenantId, start, end }) {
  const rows = await aggregateLineItems(tenantId, start, end);
  return rows.sort((a, b) => b.revenue - a.revenue);
}

// ─── COGS by product ─────────────────────────────────────────────────────────
export async function cogsByProduct({ tenantId, start, end }) {
  const rows = await aggregateLineItems(tenantId, start, end);
  return rows.sort((a, b) => b.cogs - a.cogs);
}

// ─── Revenue by rep (via contact.assignedTo) ─────────────────────────────────
export async function revenueByRep({ tenantId, start, end }) {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status:    'PAID',
      createdAt: { gte: start, lte: end },
    },
    select: {
      total:   true,
      contact: { select: { assignedTo: true } },
    },
  });

  const byRep = new Map();
  for (const inv of invoices) {
    const rep = inv.contact?.assignedTo || 'Unassigned';
    if (!byRep.has(rep)) byRep.set(rep, { rep, revenue: 0, invoiceCount: 0 });
    const row = byRep.get(rep);
    row.revenue      += inv.total;
    row.invoiceCount += 1;
  }

  return Array.from(byRep.values()).sort((a, b) => b.revenue - a.revenue);
}

// ─── KPIs ────────────────────────────────────────────────────────────────────
async function periodStats(tenantId, gte) {
  const [agg, lineItems] = await Promise.all([
    prisma.invoice.aggregate({
      where:  { tenantId, status: 'PAID', createdAt: { gte } },
      _sum:   { total: true },
      _count: { id:    true },
    }),
    prisma.lineItem.findMany({
      where: {
        invoice: { tenantId, status: 'PAID', createdAt: { gte } },
      },
      include: { product: { select: { costPrice: true } } },
    }),
  ]);

  const revenue      = agg._sum.total  || 0;
  const invoiceCount = agg._count.id   || 0;
  const cogs         = lineItems.reduce(
    (sum, li) => sum + li.quantity * (li.product?.costPrice || 0),
    0,
  );
  const grossMargin   = revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;
  const avgOrderValue = invoiceCount > 0 ? revenue / invoiceCount : 0;

  return {
    revenue:       Math.round(revenue      * 100) / 100,
    cogs:          Math.round(cogs         * 100) / 100,
    grossMargin:   Math.round(grossMargin  * 100) / 100,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    invoiceCount,
  };
}

export async function getKPIs({ tenantId }) {
  const now = new Date();

  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const qtdStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const ytdStart = new Date(now.getFullYear(), 0, 1);

  const [mtd, qtd, ytd] = await Promise.all([
    periodStats(tenantId, mtdStart),
    periodStats(tenantId, qtdStart),
    periodStats(tenantId, ytdStart),
  ]);

  return { mtd, qtd, ytd };
}

// ─── Legacy: product profitability ───────────────────────────────────────────
// Rewritten with ORM — previous version used raw SQL with wrong table names.
export async function productProfitability({ tenantId, start, end, limit = 50, offset = 0 }) {
  const rows = await aggregateLineItems(tenantId, new Date(start), new Date(end));
  return rows
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .slice(offset, offset + limit);
}

// ─── Legacy: product details ──────────────────────────────────────────────────
export async function productDetails({ tenantId, productId, start, end }) {
  const product = await prisma.product.findFirst({
    where:  { id: productId, tenantId },
    select: { id: true, name: true, sku: true, costPrice: true },
  });
  if (!product) return null;

  const lineItems = await prisma.lineItem.findMany({
    where: {
      productId,
      invoice: {
        tenantId,
        status:    'PAID',
        createdAt: { gte: new Date(start), lte: new Date(end) },
      },
    },
    include: {
      invoice: { select: { id: true, invoiceNumber: true, createdAt: true } },
    },
    orderBy: { invoice: { createdAt: 'desc' } },
    take: 20,
  });

  const revenue      = lineItems.reduce((s, li) => s + li.total,    0);
  const quantitySold = lineItems.reduce((s, li) => s + li.quantity,  0);
  const cogs         = lineItems.reduce(
    (s, li) => s + li.quantity * (product.costPrice || 0),
    0,
  );
  const grossProfit = revenue - cogs;
  const margin      = revenue > 0 ? grossProfit / revenue : 0;

  return {
    productId:    product.id,
    name:         product.name,
    sku:          product.sku,
    quantitySold,
    revenue,
    cogs,
    grossProfit,
    margin,
    invoices: lineItems.map(li => ({
      id:            li.invoice.id,
      invoiceNumber: li.invoice.invoiceNumber,
      createdAt:     li.invoice.createdAt,
      quantity:      li.quantity,
      unitPrice:     li.unitPrice,
    })),
  };
}
