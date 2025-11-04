import express from "express";
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  getProductById,
  bulkImportProducts,
  exportProductsToCSV,
} from "../controllers/product.controller.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/", createProduct);
router.get("/", getProducts);
router.get("/export", exportProductsToCSV); // ⬇️ CSV export
router.post("/import", upload.single("file"), bulkImportProducts); // ⬆️ Bulk import
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
