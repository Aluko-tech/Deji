import prisma from "../config/prisma.js";

export const getDashboardData = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: "Missing tenant context" });

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const yesterdayStart = new Date(todayStart - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);

    const [
      totalContacts,
      totalProducts,
      totalInvoices,
      invoicesToday,
      invoicesYesterday,
      unpaidInvoices,
      lowStockProducts,
      leadsToday,
      leadsYesterday,
      leadsTotal,
      revenueToday,
      revenueYesterday,
      revenueLast7Days,
      leadsBySource,
      recentLeads,
      recentInvoices,
    ] = await Promise.all([
      prisma.contact.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prisma.invoice.count({ where: { tenantId, createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.invoice.count({ where: { tenantId, status: "PENDING" } }),
      prisma.product.findMany({
        where: { tenantId, stock: { lt: LOW_STOCK_THRESHOLD } },
        select: { id: true, name: true, stock: true },
        orderBy: { stock: "asc" },
        take: 10,
      }),
      prisma.lead.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prisma.lead.count({ where: { tenantId, createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.lead.count({ where: { tenantId } }),
      prisma.payment.aggregate({
        where: { tenantId, status: { in: ["PAID", "PARTIALLY_PAID"] }, createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { tenantId, status: { in: ["PAID", "PARTIALLY_PAID"] }, createdAt: { gte: yesterdayStart, lt: todayStart } },
        _sum: { amount: true },
      }),
      prisma.invoice.findMany({
        where: { tenantId, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, total: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        where: { tenantId },
        _count: { source: true },
      }),
      prisma.lead.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, source: true, createdAt: true },
      }),
      prisma.invoice.findMany({
        where: { tenantId, status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, invoiceNumber: true, total: true, createdAt: true },
      }),
    ]);

    // Build 7-day revenue chart
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const revenueChart = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dayStr = d.toISOString().split("T")[0];
      const dayRevenue = revenueLast7Days
        .filter(r => r.createdAt.toISOString().split("T")[0] === dayStr)
        .reduce((sum, r) => sum + Number(r.total || 0), 0);
      return { day: days[d.getDay()], revenue: dayRevenue };
    });

    // Build lead sources pie chart
    const totalLeadsForSources = leadsBySource.reduce((s, l) => s + l._count.source, 0) || 1;
    const leadSources = leadsBySource.map(l => ({
      name: l.source || "Manual",
      value: Math.round((l._count.source / totalLeadsForSources) * 100),
    }));

    // Build recent activity
    const recentActivity = [
      ...recentLeads.map(l => ({
        id: `lead-${l.id}`,
        type: "lead",
        text: `New lead — ${l.name} (${l.source || "Manual"})`,
        time: new Date(l.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      })),
      ...recentInvoices.map(inv => ({
        id: `inv-${inv.id}`,
        type: "sale",
        text: `Invoice ${inv.invoiceNumber} paid — ₦${Number(inv.total).toLocaleString()}`,
        time: new Date(inv.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      })),
      ...lowStockProducts.slice(0, 2).map(p => ({
        id: `stock-${p.id}`,
        type: "stock",
        text: `Low stock alert — ${p.name} (${p.stock} left)`,
        time: "Today",
      })),
    ].slice(0, 8);

    res.json({
      todayRevenue: revenueToday._sum.amount ?? 0,
      yesterdayRevenue: revenueYesterday._sum.amount ?? 0,
      newLeads: leadsToday,
      yesterdayLeads: leadsYesterday,
      totalLeads: leadsTotal,
      posSales: invoicesToday,
      yesterdayPOS: invoicesYesterday,
      lowStockCount: lowStockProducts.length,
      totalContacts,
      totalProducts,
      unpaidInvoices,
      revenueChart,
      leadSources: leadSources.length > 0 ? leadSources : [
        { name: "No data yet", value: 100 },
      ],
      recentActivity,
      widgets: { lowStockProducts },
    });
  } catch (err) {
    console.error("[dashboard] error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(401).json({ error: "Missing tenant context" });
    const [totalContacts, totalProducts, unpaidInvoices, totalRevenue] = await Promise.all([
      prisma.contact.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId, status: "PENDING" } }),
      prisma.payment.aggregate({
        where: { tenantId, status: { in: ["PAID", "PARTIALLY_PAID"] } },
        _sum: { amount: true },
      }),
    ]);
    res.json({ totalContacts, totalProducts, unpaidInvoices, totalRevenue: totalRevenue._sum.amount ?? 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getLowStockProducts = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);
    const products = await prisma.product.findMany({
      where: { tenantId, stock: { lt: LOW_STOCK_THRESHOLD } },
      select: { id: true, name: true, stock: true },
      orderBy: { stock: "asc" },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
