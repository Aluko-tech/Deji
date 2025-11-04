// src/controllers/order.controller.js
import { PrismaClient } from "@prisma/client";
import { logAction } from "../utils/auditLog.js"; // ✅ Using auditLog

const prisma = new PrismaClient();

// ✅ CREATE ORDER
export const createOrder = async (req, res) => {
  const { products, totalAmount } = req.body;
  const { tenantId, userId } = req.user;

  if (!products || products.length === 0 || !totalAmount) {
    return res.status(400).json({ message: "Products and total amount are required." });
  }

  try {
    const order = await prisma.order.create({
      data: {
        tenantId,
        userId,
        totalAmount,
        orderItems: {
          create: products.map(p => ({
            productId: p.productId,
            quantity: p.quantity,
            price: p.price,
          })),
        },
      },
      include: { orderItems: true },
    });

    await logAction({
      tenantId,
      userId,
      action: "CREATE_ORDER",
      details: `Order #${order.id} created with total ${totalAmount}`
    });

    return res.status(201).json({
      message: "Order created successfully.",
      order,
    });
  } catch (error) {
    console.error("❌ Create Order Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ GET ALL ORDERS
export const getOrders = async (req, res) => {
  const { tenantId } = req.user;

  try {
    const orders = await prisma.order.findMany({
      where: { tenantId },
      include: { orderItems: { include: { product: true } }, user: true },
    });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("❌ Get Orders Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ GET SINGLE ORDER
export const getOrderById = async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.user;

  try {
    const order = await prisma.order.findFirst({
      where: { id: Number(id), tenantId },
      include: { orderItems: { include: { product: true } }, user: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("❌ Get Order Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ UPDATE ORDER STATUS
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { tenantId, userId } = req.user;

  try {
    const existingOrder = await prisma.order.findFirst({
      where: { id: Number(id), tenantId },
    });

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: { status },
    });

    await logAction({
      tenantId,
      userId,
      action: "UPDATE_ORDER_STATUS",
      details: `Order #${id} status updated to ${status}`
    });

    return res.status(200).json({
      message: "Order status updated successfully.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Update Order Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// ✅ DELETE ORDER
export const deleteOrder = async (req, res) => {
  const { id } = req.params;
  const { tenantId, userId } = req.user;

  try {
    const existingOrder = await prisma.order.findFirst({
      where: { id: Number(id), tenantId },
    });

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found." });
    }

    await prisma.order.delete({
      where: { id: Number(id) },
    });

    await logAction({
      tenantId,
      userId,
      action: "DELETE_ORDER",
      details: `Order #${id} deleted`
    });

    return res.status(200).json({ message: "Order deleted successfully." });
  } catch (error) {
    console.error("❌ Delete Order Error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
