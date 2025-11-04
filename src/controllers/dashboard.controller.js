// src/controllers/dashboard.controller.js
import prisma from "../config/prisma.js";

/**
 * GET /dashboard
 * Combined dashboard data (stats + charts + widgets)
 */
export const getDashboardData = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId ?? req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(401).json({ error: "Missing tenant context" });
    }

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalContacts,
      totalProducts,
      totalInvoices,
      invoicesToday,
      unpaidInvoices,
      totalPayments,
      lowStockProducts,
      messages,
      revenueLast30Days,
      topProducts,
      newContacts,
    ] = await Promise.all([
      prisma.contact.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.invoice.count({
        where: { tenantId, createdAt: { gte: todayStart } },
      }),
      prisma.invoice.count({
        where: { tenantId, status: "PENDING" },
      }),
      prisma.payment.aggregate({
        where: { tenantId, status: { in: ["PAID", "PARTIALLY_PAID"] } },
        _sum: { amount: true },
      }),
      prisma.product.findMany({
        where: { tenantId, stock: { lt: LOW_STOCK_THRESHOLD } },
        select: { id: true, name: true, stock: true },
        orderBy: { stock: "asc" },
        take: 20,
      }),
      prisma.whatsAppMessage.count({ where: { tenantId } }),
      prisma.invoice.findMany({
        where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, total: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.lineItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        where: { invoice: { tenantId } },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.contact.findMany({
        where: { tenantId, createdAt: { gte: sevenDaysAgo } },
        select: { id: true, name: true, createdAt: true },
      }),
    ]);

    // 🧮 Compute totalRevenue separately (aggregate payments)
    const totalRevenueAgg = await prisma.payment.aggregate({
      where: { tenantId, status: { in: ["PAID", "PARTIALLY_PAID"] } },
      _sum: { amount: true },
    });
    const totalRevenue = totalRevenueAgg._sum.amount ?? 0;

    // 🧩 Format & default empty data for frontend
    const chartData =
      revenueLast30Days.length > 0
        ? revenueLast30Days.map((r) => ({
            date: r.createdAt.toISOString().split("T")[0],
            total: Number(r.total),
          }))
        : [{ date: new Date().toISOString().split("T")[0], total: 0 }];

    const formattedTopProducts = topProducts.length
      ? topProducts.map((p) => ({
          productId: p.productId,
          totalSold: p._sum.quantity ?? 0,
        }))
      : [];

    res.json({
      summary: {
        totalContacts,
        totalProducts,
        totalInvoices,
        invoicesToday,
        unpaidInvoices,
        totalPayments: totalPayments._sum.amount ?? 0,
        totalRevenue, // ✅ Added
        messages,
      },
      widgets: {
        lowStockProducts,
        threshold: LOW_STOCK_THRESHOLD,
      },
      charts: {
        revenueLast30Days: chartData,
        topProducts: formattedTopProducts,
        newContacts,
      },
    });
  } catch (err) {
    console.error("[dashboard.data] error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

/**
 * GET /dashboard/stats
 * Lightweight stats only (summary)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId ?? req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(401).json({ error: "Missing tenant context" });
    }

    const [totalContacts, totalProducts, unpaidInvoices, totalPayments, messages] =
      await Promise.all([
        prisma.contact.count({ where: { tenantId } }),
        prisma.product.count({ where: { tenantId } }),
        prisma.invoice.count({ where: { tenantId, status: "PENDING" } }),
        prisma.payment.aggregate({
          where: { tenantId, status: { in: ["PAID", "PARTIALLY_PAID"] } },
          _sum: { amount: true },
        }),
        prisma.whatsAppMessage.count({ where: { tenantId } }),
      ]);

    // Compute totalRevenue for stats endpoint too
    const totalRevenueAgg = await prisma.payment.aggregate({
      where: { tenantId, status: { in: ["PAID", "PARTIALLY_PAID"] } },
      _sum: { amount: true },
    });
    const totalRevenue = totalRevenueAgg._sum.amount ?? 0;

    res.json({
      totalContacts,
      totalProducts,
      unpaidInvoices,
      totalPayments: totalPayments._sum.amount ?? 0,
      totalRevenue, // ✅ Added
      messages,
    });
  } catch (err) {
    console.error("[dashboard.stats] error:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

/**
 * GET /dashboard/low-stock
 * List of low stock products
 */
export const getLowStockProducts = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId ?? req.headers["x-tenant-id"];
    if (!tenantId) {
      return res.status(401).json({ error: "Missing tenant context" });
    }

    const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);

    const lowStockProducts = await prisma.product.findMany({
      where: { tenantId, stock: { lt: LOW_STOCK_THRESHOLD } },
      select: { id: true, name: true, stock: true },
      orderBy: { stock: "asc" },
      take: 20,
    });

    res.json(lowStockProducts);
  } catch (err) {
    console.error("[dashboard.lowStock] error:", err);
    res.status(500).json({ error: "Failed to fetch low-stock products" });
  }
};
