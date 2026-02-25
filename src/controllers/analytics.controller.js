import { productProfitability, productDetails } from "../services/analytics.service.js";

export const getProductProfitability = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { start, end, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // validate dates (basic)
    const s = start ? new Date(start) : new Date(0);
    const e = end ? new Date(end) : new Date();

    const rows = await productProfitability({ tenantId, start: s.toISOString(), end: e.toISOString(), limit: Number(limit), offset });
    return res.json({ meta: { page: Number(page), limit: Number(limit) }, data: rows });
  } catch (err) {
    console.error("Analytics - productProfitability error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

export const getProductDetails = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { start, end } = req.query;
    const s = start ? new Date(start) : new Date(0);
    const e = end ? new Date(end) : new Date();

    const details = await productDetails({ tenantId, productId: id, start: s.toISOString(), end: e.toISOString() });
    if (!details) return res.status(404).json({ message: "Product not found." });
    return res.json(details);
  } catch (err) {
    console.error("Analytics - productDetails error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
};
