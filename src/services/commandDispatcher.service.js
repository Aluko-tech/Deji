// src/services/commandDispatcher.service.js
import prisma from '../config/prisma.js';
import { sendEmail } from './email.service.js'; // if used
import { sendWhatsAppMessage } from './whatsapp.service.js'; // reply back

/**
 * Parse and execute #commands from admin/staff.
 * Returns a simple text reply describing what was done.
 */
export async function dispatchCommand({ tenantId, from, text }) {
  const cleaned = text.trim();
  const parts = cleaned.split(/\s+/);
  const cmd = parts[0].toLowerCase(); // e.g. "#deliver"

  // Example commands:
  // 1) #deliver all → mark all pending invoices as delivered
  if (cmd === '#deliver') {
    if (parts[1]?.toLowerCase() === 'all') {
      const updated = await prisma.invoice.updateMany({
        where: { tenantId, status: 'PENDING' },
        data: { status: 'DELIVERED' },
      });
      return `✅ Marked ${updated.count} pending invoice(s) as DELIVERED.`;
    }
    // #deliver 123 → mark specific invoice delivered
    const id = parts[1];
    if (id) {
      const result = await prisma.invoice.updateMany({
        where: { tenantId, id },
        data: { status: 'DELIVERED' },
      });
      if (result.count === 0) return `⚠️ Invoice ${id} not found or already delivered.`;
      return `✅ Invoice ${id} marked as DELIVERED.`;
    }
    return 'Usage: #deliver all | #deliver <invoiceId>';
  }

  // 2) #lowstock report → low stock products
  if (cmd === '#lowstock') {
    const threshold = Number(parts[1]) || 5;
    const items = await prisma.product.findMany({
      where: { tenantId, stock: { lt: threshold } },
      select: { id: true, name: true, stock: true },
    });
    if (items.length === 0) return '✅ No low-stock items.';
    const lines = items.map(p => `• ${p.name} — ${p.stock}`);
    return `📉 Low-stock (<${threshold})\n${lines.join('\n')}`;
  }

  // 3) #invoice 123 send <phone>
  if (cmd === '#invoice') {
    const invoiceId = parts[1];
    if (!invoiceId) return 'Usage: #invoice <id> send <phone>';
    if (parts[2]?.toLowerCase() === 'send') {
      const phone = parts[3];
      if (!phone) return 'Usage: #invoice <id> send <phone>';
      const inv = await prisma.invoice.findFirst({
        where: { tenantId, id: invoiceId },
        include: { items: true, contact: true },
      });
      if (!inv) return `⚠️ Invoice ${invoiceId} not found.`;
      const total = inv.items.reduce((s, it) => s + Number(it.total), 0);
      const txt = `🧾 Invoice ${inv.number || inv.id}\nCustomer: ${inv.contact?.name ?? '-'}\nTotal: ${total}\nStatus: ${inv.status}`;
      await sendWhatsAppMessage(phone, txt);
      return `✅ Invoice ${invoiceId} sent to ${phone}.`;
    }
    return 'Usage: #invoice <id> send <phone>';
  }

  // 4) #ledger balance
  if (cmd === '#ledger' && parts[1]?.toLowerCase() === 'balance') {
    const credits = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { tenantId, type: 'CREDIT' },
    });
    const debits = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { tenantId, type: 'DEBIT' },
    });
    const bal = Number(credits._sum.amount || 0) - Number(debits._sum.amount || 0);
    return `📊 Ledger balance: ${bal}`;
  }

  // Default unknown
  return '🤖 Unknown command. Try: #deliver all | #lowstock | #invoice <id> send <phone> | #ledger balance';
}
