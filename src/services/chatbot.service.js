// src/services/chatbot.service.js
import { aiChatComplete } from './ai.service.js';
import { dispatchCommand } from './commandDispatcher.service.js';
import prisma from '../config/prisma.js';

/**
 * System prompt remains concise, but we’ll rely on tool functions
 * for structured queries first (inventory, order status, etc.)
 */
const SYSTEM_PROMPT = `
You are a helpful ERP assistant for SMEs on WhatsApp. 
- If the user is a customer, answer product availability, pricing, order status.
- If the user is an admin/staff (internal), answer operational questions concisely.
- Keep replies short and clear.
`;

/**
 * Intent detection heuristics → call DB tools → fallback to AI.
 */
async function detectIntent(text) {
  const lower = text.toLowerCase();

  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
    return 'PRODUCT_PRICE';
  }
  if (lower.includes('available') || lower.includes('in stock') || lower.includes('stock')) {
    return 'PRODUCT_AVAILABILITY';
  }
  if (lower.includes('order') && (lower.includes('status') || lower.includes('track'))) {
    return 'ORDER_STATUS';
  }
  if (lower.startsWith('#')) {
    return 'ADMIN_COMMAND';
  }
  return 'CHAT';
}

/**
 * DB Tools
 */
async function handleIntent(intent, { tenantId, from, text }) {
  switch (intent) {
    case 'PRODUCT_PRICE': {
      // naive: grab first product mentioned
      const words = text.split(/\s+/);
      const product = await prisma.product.findFirst({
        where: { tenantId, name: { contains: words[words.length - 1], mode: 'insensitive' } },
      });
      if (!product) return "I couldn't find that product.";
      return `${product.name} costs ${product.price} ${product.currency || '₦'}`;
    }

    case 'PRODUCT_AVAILABILITY': {
      const words = text.split(/\s+/);
      const product = await prisma.product.findFirst({
        where: { tenantId, name: { contains: words[words.length - 1], mode: 'insensitive' } },
      });
      if (!product) return "Not sure, product not found.";
      return product.stock > 0
        ? `${product.name} is in stock (${product.stock} left)`
        : `${product.name} is currently out of stock`;
    }

    case 'ORDER_STATUS': {
      const orderId = text.match(/\d+/)?.[0]; // crude: extract number
      if (!orderId) return "Please provide your order number.";
      const order = await prisma.invoice.findFirst({
        where: { tenantId, id: Number(orderId) },
      });
      if (!order) return "Order not found.";
      return `Order #${order.id} is currently ${order.status}`;
    }

    default:
      return null;
  }
}

/**
 * Main handler
 */
export async function handleIncomingMessage({ tenantId, from, text, isAdmin = false }) {
  const trimmed = (text || '').trim();

  // Detect intent
  const intent = await detectIntent(trimmed);

  // Admin command
  if (isAdmin && intent === 'ADMIN_COMMAND') {
    return await dispatchCommand({ tenantId, from, text: trimmed });
  }

  // Structured DB answers
  const dbReply = await handleIntent(intent, { tenantId, from, text: trimmed });
  if (dbReply) return dbReply;

  // Fallback: AI free-text
  const aiReply = await aiChatComplete({
    system: SYSTEM_PROMPT,
    user: trimmed,
  });

  return aiReply || '🤖 Sorry, I didn’t catch that.';
}
