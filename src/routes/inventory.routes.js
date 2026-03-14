import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

// GET /api/inventory — all products with stock info
router.get("/", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/inventory/low-stock
router.get("/low-stock", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        tenantId: req.user.tenantId,
        type: "product",
        stock: { lte: prisma.product.fields.lowStockThreshold },
      },
    });

    // Fallback manual filter
    const all = await prisma.product.findMany({
      where: { tenantId: req.user.tenantId, type: "product" },
    });
    const lowStock = all.filter(p => p.stock <= p.lowStockThreshold);

    res.json({ products: lowStock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/inventory/:id — update stock
router.put("/:id", async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { stock: parseInt(stock) },
    });

    // Log stock change
    await prisma.stockAuditLog.create({
      data: {
        tenantId: req.user.tenantId,
        productId: product.id,
        changeType: "manual",
        oldValue: 0,
        newValue: product.stock,
        triggeredBy: req.user.userId,
      },
    });

    res.json({ product });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
