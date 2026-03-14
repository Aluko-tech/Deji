import {
  createProductService,
  getProductsService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  adjustStockService,
  getInventoryStatsService,
} from '../services/product.service.js';
import { logAudit } from '../utils/auditLog.js';

export const createProduct = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const product = await createProductService(tenantId, req.body);
    await logAudit({ tenantId, userId: req.user?.id, action: 'CREATE_PRODUCT', model: 'Product', modelId: product.id });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const result = await getProductsService(tenantId, req.query);
    res.json({ success: true, data: result.products, total: result.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const product = await getProductByIdService(tenantId, req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const product = await updateProductService(tenantId, req.params.id, req.body);
    await logAudit({ tenantId, userId: req.user?.id, action: 'UPDATE_PRODUCT', model: 'Product', modelId: product.id });
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    await deleteProductService(tenantId, req.params.id);
    await logAudit({ tenantId, userId: req.user?.id, action: 'DELETE_PRODUCT', model: 'Product', modelId: req.params.id });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const { quantity, reason } = req.body;
    const product = await adjustStockService(tenantId, req.params.id, quantity, reason, req.user?.id);
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getInventoryStats = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.tenantId;
    const stats = await getInventoryStatsService(tenantId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkImportProducts = async (req, res) => {
  res.json({ success: true, message: 'Bulk import coming soon' });
};

export const exportProductsToCSV = async (req, res) => {
  res.json({ success: true, message: 'Export coming soon' });
};
