import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Get product profitability for a tenant within date range
 * Returns rows with productId, name, qty_sold, revenue, cogs, other_expenses, net_profit, margin
 */
export async function productProfitability({ tenantId, start, end, limit = 50, offset = 0 }) {
  // Use raw SQL aggregation for performance. Parameterized via template literals.
  const rows = await prisma.$queryRaw`
    SELECT
      p.id as "productId",
      p.name as name,
      COALESCE(SUM(ii.quantity),0) as "qty_sold",
      COALESCE(SUM(ii.quantity * ii.unit_price),0) as revenue,
      COALESCE(SUM(ii.quantity * COALESCE(ii.cost_price,0)),0) as cogs,
      COALESCE(SUM(exp.amount),0) as "otherExpenses",
      (COALESCE(SUM(ii.quantity * ii.unit_price),0) - COALESCE(SUM(ii.quantity * COALESCE(ii.cost_price,0)),0) - COALESCE(SUM(exp.amount),0)) as "netProfit"
    FROM "InvoiceItem" ii
    JOIN "Invoice" inv ON inv.id = ii.invoiceId AND inv."tenantId" = ${tenantId} AND inv.status = 'PAID' AND inv."createdAt" BETWEEN ${start} AND ${end}
    JOIN "Product" p ON p.id = ii."productId"
    LEFT JOIN "Expense" exp ON exp."productId" = p.id AND exp."tenantId" = ${tenantId} AND exp."date" BETWEEN ${start} AND ${end}
    GROUP BY p.id, p.name
    ORDER BY "netProfit" DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  // calculate margin per row
  return rows.map((r) => {
    const revenue = Number(r.revenue || 0);
    const net = Number(r.netProfit || 0);
    const margin = revenue === 0 ? 0 : net / revenue;
    return {
      productId: r.productId,
      name: r.name,
      quantitySold: Number(r.qty_sold || 0),
      revenue: Number(r.revenue || 0),
      cogs: Number(r.cogs || 0),
      otherExpenses: Number(r.otherExpenses || 0),
      netProfit: Number(r.netProfit || 0),
      margin,
    };
  });
}

export async function productDetails({ tenantId, productId, start, end }) {
  // basic product aggregation
  const rows = await prisma.$queryRaw`
    SELECT
      p.id as "productId",
      p.name as name,
      p.sku as sku,
      COALESCE(SUM(ii.quantity),0) as "quantitySold",
      COALESCE(SUM(ii.quantity * ii.unit_price),0) as revenue,
      COALESCE(SUM(ii.quantity * COALESCE(ii.cost_price,0)),0) as cogs,
      COALESCE(SUM(exp.amount),0) as "otherExpenses",
      (COALESCE(SUM(ii.quantity * ii.unit_price),0) - COALESCE(SUM(ii.quantity * COALESCE(ii.cost_price,0)),0) - COALESCE(SUM(exp.amount),0)) as "netProfit"
    FROM "Product" p
    LEFT JOIN "InvoiceItem" ii ON ii."productId" = p.id
    LEFT JOIN "Invoice" inv ON inv.id = ii."invoiceId" AND inv."tenantId" = ${tenantId} AND inv.status = 'PAID' AND inv."createdAt" BETWEEN ${start} AND ${end}
    LEFT JOIN "Expense" exp ON exp."productId" = p.id AND exp."tenantId" = ${tenantId} AND exp."date" BETWEEN ${start} AND ${end}
    WHERE p.id = ${productId} AND p."tenantId" = ${tenantId}
    GROUP BY p.id, p.name, p.sku
    LIMIT 1;
  `;

  const row = rows[0];
  if (!row) return null;
  const revenue = Number(row.revenue || 0);
  const net = Number(row.netProfit || 0);
  const margin = revenue === 0 ? 0 : net / revenue;

  // recent invoices for that product
  const invoices = await prisma.$queryRaw`
    SELECT inv.id, inv."number", inv."createdAt", ii.quantity, ii.unit_price, ii."cost_price"
    FROM "InvoiceItem" ii
    JOIN "Invoice" inv ON inv.id = ii."invoiceId" AND inv."tenantId" = ${tenantId} AND inv.status = 'PAID' AND inv."createdAt" BETWEEN ${start} AND ${end}
    WHERE ii."productId" = ${productId}
    ORDER BY inv."createdAt" DESC
    LIMIT 20;
  `;

  return {
    productId: row.productId,
    name: row.name,
    sku: row.sku,
    quantitySold: Number(row.quantitySold || 0),
    revenue: Number(row.revenue || 0),
    cogs: Number(row.cogs || 0),
    otherExpenses: Number(row.otherExpenses || 0),
    netProfit: Number(row.netProfit || 0),
    margin,
    invoices,
  };
}
