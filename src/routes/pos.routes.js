import { Router } from "express";
import prisma from "../config/prisma.js";

const router = Router();

// POST /api/pos/sale — process a sale
router.post("/sale", async (req, res) => {
  const { items, paymentMethod, subtotal, tax, total } = req.body;
  const { tenantId, userId } = req.user;

  if (!items || !items.length) {
    return res.status(400).json({ message: "No items in sale" });
  }

  try {
    // 1. Find or create a "POS" contact for walk-in customers
    let posContact = await prisma.contact.findFirst({
      where: { tenantId, email: `pos-walkin@${tenantId}.deji` },
    });

    if (!posContact) {
      posContact = await prisma.contact.create({
        data: {
          tenantId,
          name: "Walk-in Customer",
          email: `pos-walkin@${tenantId}.deji`,
        },
      });
    }

    // 2. Generate invoice number
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
    const prefix = settings?.invoicePrefix || "POS-";
    const count = await prisma.invoice.count({ where: { tenantId } });
    const invoiceNumber = `${prefix}${String(count + 1).padStart(4, "0")}`;

    // 3. Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        contactId: posContact.id,
        invoiceNumber,
        issueDate: new Date(),
        dueDate: new Date(),
        status: "PAID",
        subtotal: subtotal || 0,
        tax: tax || 0,
        discount: 0,
        total: total || 0,
        currency: settings?.currency || "NGN",
        lineItems: {
          create: items.map(item => ({
            productId: item.id,
            description: item.name,
            quantity: item.qty,
            unitPrice: item.price,
            total: item.price * item.qty,
          })),
        },
      },
      include: { lineItems: true },
    });

    // 4. Create payment record
    await prisma.payment.create({
      data: {
        tenantId,
        invoiceId: invoice.id,
        amount: total || 0,
        method: paymentMethod || "cash",
        status: "PAID",
      },
    });

    // 5. Deduct stock for each product
    for (const item of items) {
      if (item.id) {
        const product = await prisma.product.findFirst({
          where: { id: item.id, tenantId },
        });

        if (product && product.type === "product") {
          const newStock = Math.max(0, product.stock - item.qty);
          await prisma.product.update({
            where: { id: item.id },
            data: { stock: newStock },
          });

          // Log stock deduction
          await prisma.stockAuditLog.create({
            data: {
              tenantId,
              productId: item.id,
              changeType: "deduct",
              oldValue: product.stock,
              newValue: newStock,
              triggeredBy: userId || "pos",
            },
          });

          // Check low stock and alert
          if (newStock <= product.lowStockThreshold && newStock > 0) {
            await prisma.lowStockAlert.create({
              data: {
                tenantId,
                productId: item.id,
                message: `${product.name} is low on stock: ${newStock} units remaining`,
                sentVia: "system",
              },
            });
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      invoice,
      message: "Sale processed successfully",
    });
  } catch (err) {
    console.error("POS sale error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/pos/history — recent POS transactions
router.get("/history", async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { limit = 50 } = req.query;

    const posContact = await prisma.contact.findFirst({
      where: { tenantId, email: { contains: "pos-walkin" } },
    });

    if (!posContact) return res.json({ transactions: [] });

    const invoices = await prisma.invoice.findMany({
      where: { tenantId, contactId: posContact.id },
      include: { lineItems: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
    });

    res.json({ transactions: invoices });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
