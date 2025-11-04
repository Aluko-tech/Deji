import sendWhatsAppMessage from '../services/whatsapp.service.js';
import sendEmail from '../services/email.service.js';

export async function notifyLowStock(product, tenant) {
  const message = `🔔 Low Stock Alert:
Product: ${product.name}
Stock Left: ${product.stock}
Threshold: ${product.lowStockThreshold}`;

  const subject = `Low Stock Alert for ${product.name}`;

  // Email
  if (tenant.email) {
    await sendEmail({
      to: tenant.email,
      subject,
      text: message,
    });
  }

  // WhatsApp
  if (tenant.whatsappNumber) {
    await sendWhatsAppMessage({
      phone: tenant.whatsappNumber,
      message,
    });
  }

  console.log('Low stock notification sent.');
}
