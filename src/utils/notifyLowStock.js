import { sendEmail } from '../services/email.service.js';
import { sendWhatsAppMessage } from '../services/whatsapp.service.js';

export async function notifyLowStock({ product, tenant, recipients }) {
  const productName = product.name;
  const stock = product.stock;
  const threshold = product.lowStockThreshold;

  const message = `⚠️ Low Stock Alert: "${productName}" has only ${stock} units left. Threshold: ${threshold}.`;

  for (const recipient of recipients) {
    const { email, phone } = recipient;

    // Send Email
    if (email) {
      await sendEmail({
        to: email,
        subject: `Low Stock Alert: ${productName}`,
        html: `
          <h3>Low Stock Notification</h3>
          <p>Dear ${recipient.name || 'User'},</p>
          <p>The product <strong>${productName}</strong> has only <strong>${stock}</strong> units remaining.</p>
          <p>Configured low-stock threshold: ${threshold}</p>
          <p>Regards,<br/>Deji API</p>
        `,
      });
    }

    // Send WhatsApp
    if (phone) {
      await sendWhatsAppMessage(phone, message);
    }
  }
}
