import {
  createProductService,
  getProductsService,
  getProductByIdService,
  updateProductService,
  deleteProductService,
  exportProductsToCSVService,
  bulkImportProductsService,
} from '../services/product.service.js';
import { logAudit } from '../utils/auditLog.js';

// ✅ Create Product
export const createProduct = async (req, res) => {
  try {
    const product = await createProductService(req.tenantId, req.body);
    await logAudit(req.user.id, req.tenantId, 'CREATE_PRODUCT', `Created product ${product.id}`);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ✅ Get All Products
export const getProducts = async (req, res) => {
  try {
    const products = await getProductsService(req.tenantId, req.query);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get Product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await getProductByIdService(req.tenantId, req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update Product
export const updateProduct = async (req, res) => {
  try {
    const product = await updateProductService(req.tenantId, req.params.id, req.body);
    await logAudit(req.user.id, req.tenantId, 'UPDATE_PRODUCT', `Updated product ${req.params.id}`);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// ✅ Delete Product
export const deleteProduct = async (req, res) => {
  try {
    await deleteProductService(req.tenantId, req.params.id);
    await logAudit(req.user.id, req.tenantId, 'DELETE_PRODUCT', `Deleted product ${req.params.id}`);
    res.json({ message: 'Product deleted' });
  } catch (error) {
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
    await logAudit(req.user.id, req.tenantId, 'IMPORT_PRODUCTS', `Imported ${products.length} products`);

    res.status(201).json({ message: 'Products imported', count: products.length, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
