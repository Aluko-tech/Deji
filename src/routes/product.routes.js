import express from "express";
import { enforceLimit } from "../middleware/planLimit.middleware.js";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  createProduct, getProducts, getProductById,
  updateProduct, deleteProduct, adjustStock,
  getInventoryStats, bulkImportProducts, exportProductsToCSV,
} from "../controllers/product.controller.js";

const router = express.Router();
router.use(authenticate);

// All authenticated roles can view products (needed for invoicing, POS, etc.)
const VIEW_ROLES   = ['admin','manager','staff','sales','sales_rep','marketer','accountant','inventory'];
// These roles can create/update products
const EDIT_ROLES   = ['admin','manager','inventory','staff'];
// Only admin/manager can delete
const DELETE_ROLES = ['admin','manager'];

router.get("/stats",          authorize(VIEW_ROLES),   getInventoryStats);
router.get("/export",         authorize(EDIT_ROLES),   enforceLimit("bulkImport"), exportProductsToCSV);
router.post("/import",        authorize(EDIT_ROLES),   enforceLimit("bulkImport"), bulkImportProducts);
router.get("/",               authorize(VIEW_ROLES),   getProducts);
router.post("/",              authorize(EDIT_ROLES),   enforceLimit("productsMax"), createProduct);
router.get("/:id",            authorize(VIEW_ROLES),   getProductById);
router.put("/:id",            authorize(EDIT_ROLES),   updateProduct);
router.delete("/:id",         authorize(DELETE_ROLES), deleteProduct);
router.post("/:id/adjust-stock", authorize(EDIT_ROLES), adjustStock);

export default router;
