// src/controllers/inventory.controller.js
import { PrismaClient } from "@prisma/client";
import { logAction } from "../utils/auditLog.js";

const prisma = new PrismaClient();

// ✅ ADD INVENTORY ITEM
export const addInventoryItem = async (req, res) => {
  const { productId, quantity } = req.body;
  const { tenantId, userId } = req.user;

  if (!productId || !quantity) {
    return res.status(400).json({ message: "Product ID and quantity are required." });
  }

  try {
    const inventoryItem = await prisma.inventory.create({
      data: { productId, quantity, tenantId },
    });

    await logAction({
      tenantId,
      userId,
      action: "ADD_INVENTORY",
      details: `Added ${quantity} units to product ID ${productId}`
    });

    return res.status(201).json({
      message: "Inventory item added successfully.",
      inventoryItem,
    });
  } catch (error) {
    console.error("❌ Add Inventory Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ GET INVENTORY
export const getInventory = async (req, res) => {
  const { tenantId } = req.user;

  try {
    const inventory = await prisma.inventory.findMany({
      where: { tenantId },
      include: { product: true },
    });

    return res.status(200).json(inventory);
  } catch (error) {
    console.error("❌ Get Inventory Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ GET LOW STOCK PRODUCTS
export const getLowStockProducts = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const lowStockProducts = await prisma.product.findMany({
      where: {
        tenantId,
        stock: { lte: prisma.product.fields.lowStockThreshold },
      },
      select: {
        id: true,
        name: true,
        stock: true,
        lowStockThreshold: true,
      },
    });

    res.json(lowStockProducts);
  } catch (error) {
    console.error("❌ Low Stock Error:", error);
    res.status(500).json({ message: "Error retrieving low stock products" });
  }
};

// ✅ UPDATE INVENTORY
export const updateInventory = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  const { tenantId, userId } = req.user;

  try {
    const existingItem = await prisma.inventory.findFirst({
      where: { id: Number(id), tenantId },
    });

    if (!existingItem) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    const updatedItem = await prisma.inventory.update({
      where: { id: Number(id) },
      data: { quantity },
    });

    await logAction({
      tenantId,
      userId,
      action: "UPDATE_INVENTORY",
      details: `Updated inventory item #${id} quantity to ${quantity}`
    });

    return res.status(200).json({
      message: "Inventory updated successfully.",
      inventory: updatedItem,
    });
  } catch (error) {
    console.error("❌ Update Inventory Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ DELETE INVENTORY
export const deleteInventory = async (req, res) => {
  const { id } = req.params;
  const { tenantId, userId } = req.user;

  try {
    const existingItem = await prisma.inventory.findFirst({
      where: { id: Number(id), tenantId },
    });

    if (!existingItem) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    await prisma.inventory.delete({
      where: { id: Number(id) },
    });

    await logAction({
      tenantId,
      userId,
      action: "DELETE_INVENTORY",
      details: `Deleted inventory item #${id}`
    });

    return res.status(200).json({ message: "Inventory item deleted successfully." });
  } catch (error) {
    console.error("❌ Delete Inventory Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
