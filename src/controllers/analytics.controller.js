import {
  productProfitability,
  productDetails,
  revenueByProduct,
  cogsByProduct,
  revenueByRep,
  getKPIs,
} from '../services/analytics.service.js';

// ── Default date range: year-to-date ─────────────────────────────────────────
function parseDateRange(query) {
  const start = query.start
    ? new Date(query.start)
    : new Date(new Date().getFullYear(), 0, 1);   // Jan 1 this year
  const end = query.end ? new Date(query.end) : new Date();
  return { start, end };
}

// GET /api/analytics/product-profitability
export const getProductProfitability = async (req, res) => {
  try {
    const tenantId      = req.tenantId;
    const { start, end } = parseDateRange(req.query);
    const page          = Math.max(1, Number(req.query.page  || 1));
    const limit         = Math.min(200, Number(req.query.limit || 50));
    const offset        = (page - 1) * limit;

    const rows = await productProfitability({
      tenantId,
      start: start.toISOString(),
      end:   end.toISOString(),
      limit,
      offset,
    });
    return res.json({ meta: { page, limit }, data: rows });
  } catch (err) {
    console.error('Analytics - productProfitability error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/analytics/product/:id/details
export const getProductDetails = async (req, res) => {
  try {
    const tenantId       = req.tenantId;
    const { start, end } = parseDateRange(req.query);

    const details = await productDetails({
      tenantId,
      productId: req.params.id,
      start:     start.toISOString(),
      end:       end.toISOString(),
    });
    if (!details) return res.status(404).json({ message: 'Product not found.' });
    return res.json(details);
  } catch (err) {
    console.error('Analytics - productDetails error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/analytics/revenue-by-product
export const getRevenueByProduct = async (req, res) => {
  try {
    const tenantId       = req.tenantId;
    const { start, end } = parseDateRange(req.query);
    const rows = await revenueByProduct({ tenantId, start, end });
    return res.json({ data: rows });
  } catch (err) {
    console.error('Analytics - revenueByProduct error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/analytics/cogs-by-product
export const getCOGSByProduct = async (req, res) => {
  try {
    const tenantId       = req.tenantId;
    const { start, end } = parseDateRange(req.query);
    const rows = await cogsByProduct({ tenantId, start, end });
    return res.json({ data: rows });
  } catch (err) {
    console.error('Analytics - cogsByProduct error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/analytics/revenue-by-rep
export const getRevenueByRep = async (req, res) => {
  try {
    const tenantId       = req.tenantId;
    const { start, end } = parseDateRange(req.query);
    const rows = await revenueByRep({ tenantId, start, end });
    return res.json({ data: rows });
  } catch (err) {
    console.error('Analytics - revenueByRep error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

// GET /api/analytics/kpis
export const getAnalyticsKPIs = async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const kpis = await getKPIs({ tenantId });
    return res.json(kpis);
  } catch (err) {
    console.error('Analytics - getKPIs error:', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
