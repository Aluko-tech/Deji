import {
  createProductService,
  getProductsService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  exportProductsToCSVService,
  bulkImportProductsService,
} from '../services/product.service.js';
import { logAudit } from '../services/auditLog.service.js';

// ✅ Create Product
export const createProduct = async (req, res) => {
  try {
    const product = await createProductService(req.tenantId, req.body);
    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'CREATE_PRODUCT',
      model: 'Product',
      modelId: product.id,
      details: { name: product.name, price: product.price },
    });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('❌ Create Product Error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ✅ Get All Products
export const getProducts = async (req, res) => {
  try {
    const products = await getProductsService(req.tenantId, req.query);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error("❌ Get Products Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get Product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await getProductByIdService(req.tenantId, req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) {
    console.error("❌ Get Product Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update Product
export const updateProduct = async (req, res) => {
  try {
    const product = await updateProductService(req.tenantId, req.params.id, req.body);
    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'UPDATE_PRODUCT',
      model: 'Product',
      modelId: req.params.id,
      details: req.body,
    });
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('❌ Update Product Error:', error);
    res.status(400).json({ error: error.message });
  }
};

// ✅ Delete Product
export const deleteProduct = async (req, res) => {
  try {
    await deleteProductService(req.tenantId, req.params.id);
    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'DELETE_PRODUCT',
      model: 'Product',
      modelId: req.params.id,
    });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('❌ Delete Product Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ Export Products to CSV
export const exportProductsToCSV = async (req, res) => {
  try {
    const csvData = await exportProductsToCSVService(req.tenantId, req.query);
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Bulk Import Products
export const bulkImportProducts = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const products = await bulkImportProductsService(req.tenantId, req.file.buffer);
    await logAudit({
      tenantId: req.tenantId,
      userId: req.userId,
      action: 'IMPORT_PRODUCTS',
      model: 'Product',
      details: { count: products.length, file: req.file.originalname },
    });

    res.status(201).json({ success: true, message: 'Products imported', count: products.length, data: products });
  } catch (error) {
    console.error('❌ Bulk Import Error:', error);
    res.status(500).json({ error: error.message });
  }
};
