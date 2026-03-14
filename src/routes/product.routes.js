import express from "express";
import { enforceLimit } from "../middleware/planLimit.middleware.js";
import { authenticate } from "../middleware/auth.js";
import {
  createProduct, getProducts, getProductById,
  updateProduct, deleteProduct, adjustStock,
  getInventoryStats, bulkImportProducts, exportProductsToCSV,
} from "../controllers/product.controller.js";

const router = express.Router();
router.use(authenticate);

router.get("/stats", getInventoryStats);
router.get("/export", enforceLimit("bulkImport"), exportProductsToCSV);
router.post("/import", enforceLimit("bulkImport"), bulkImportProducts);
router.get("/", getProducts);
router.post("/", enforceLimit("productsMax"), createProduct);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/:id/adjust-stock", adjustStock);

export default router;
