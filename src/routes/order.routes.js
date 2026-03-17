import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticate);

const tid = req => req.user.tenantId;
const uid = req => req.user.id;

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const { status, assignedTo, leadId, limit = 200 } = req.query;
    const where = { tenantId: tid(req) };
    if (status)     where.status     = status;
    if (assignedTo) where.assignedTo = assignedTo;
    if (leadId)     where.leadId     = leadId;

    if (req.user.role === 'sales_rep' || req.user.role === 'staff') {
      where.assignedTo = uid(req);
    }

    const orders = await prisma.order.findMany({
      where,
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
      take:    Number(limit),
    });

    const enriched = await Promise.all(orders.map(async (order) => {
      let lead = null;
      if (order.leadId) {
        lead = await prisma.lead.findFirst({
          where:  { id: order.leadId, tenantId: tid(req) },
          select: { id:true, name:true, email:true, phone:true },
        }).catch(() => null);
      }
      return { ...order, lead };
    }));

    res.json({ success: true, data: enriched, total: enriched.length });
  } catch (e) {
    console.error('[ORDER GET]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where:   { id: req.params.id, tenantId: tid(req) },
      include: { orderItems: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let lead = null;
    if (order.leadId) {
      lead = await prisma.lead.findFirst({
        where:  { id: order.leadId, tenantId: tid(req) },
        select: { id:true, name:true, email:true, phone:true, company:true },
      }).catch(() => null);
    }

    res.json({ success: true, data: { ...order, lead } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  const { products, orderItems, totalAmount, leadId, assignedTo, notes, status = 'pending', deliveryAddress } = req.body;
  const items = orderItems || products || [];
  if (!items.length) return res.status(400).json({ message: 'Order items are required.' });
  try {
    const order = await prisma.order.create({
      data: {
        tenantId:        tid(req),
        userId:          uid(req),
        assignedTo:      assignedTo || uid(req),
        leadId:          leadId     || null,
        totalAmount:     Number(totalAmount) || 0,
        status,
        notes:           notes           || null,
        deliveryAddress: deliveryAddress || null,
        orderItems: {
          create: items.map(p => ({
            productId: p.productId || null,
            quantity:  Number(p.quantity)              || 1,
            price:     Number(p.price || p.unitPrice)  || 0,
          })),
        },
      },
      include: { orderItems: true },
    });
    res.status(201).json({ success: true, data: order });
  } catch (e) {
    console.error('[ORDER POST]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where:   { id: req.params.id, tenantId: tid(req) },
      include: { orderItems: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isAdmin    = ['admin', 'manager'].includes(req.user.role);
    const isAssigned = order.assignedTo === uid(req);
    if (!isAdmin && !isAssigned) {
      return res.status(403).json({ error: 'You can only edit orders assigned to you.' });
    }

    const { orderItems, products, status, notes, deliveryAddress, assignedTo, totalAmount } = req.body;
    const items = orderItems || products;

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(status          !== undefined && { status }),
        ...(notes           !== undefined && { notes }),
        ...(deliveryAddress !== undefined && { deliveryAddress }),
        ...(assignedTo      !== undefined && { assignedTo }),
        ...(totalAmount     !== undefined && { totalAmount: Number(totalAmount) }),
      },
    });

    if (items?.length) {
      await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
      await prisma.orderItem.createMany({
        data: items.map(p => ({
          orderId:   req.params.id,
          productId: p.productId || null,
          quantity:  Number(p.quantity)              || 1,
          price:     Number(p.price || p.unitPrice)  || 0,
        })),
      });
    }

    prisma.auditLog.create({
      data: {
        tenantId: tid(req),
        userId:   uid(req),
        action:   'UPDATE_ORDER',
        model:    'Order',
        modelId:  req.params.id,
        details:  { status, notes },
      },
    }).catch(() => {});

    res.json({ success: true, data: updatedOrder });
  } catch (e) {
    console.error('[ORDER PUT]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, tenantId: tid(req) },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can delete orders.' });
    }
    await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Order deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;