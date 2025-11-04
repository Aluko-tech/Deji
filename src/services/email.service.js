import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// General-purpose email sender
export async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

// Low-stock alert sender
async function sendLowStockAlert(products = []) {
  if (!products.length) return;

  const to = process.env.LOW_STOCK_ALERT_EMAIL;
  const subject = '🔔 Low Stock Alert - Deji API';
  const productList = products.map(p =>
    `<li><strong>${p.name}</strong>: Only <strong>${p.stock}</strong> left (Minimum: ${p.lowStockThreshold})</li>`
  ).join('');

  const html = `
    <h3>⚠️ Low Stock Notification</h3>
    <p>The following products are below their stock threshold:</p>
    <ul>${productList}</ul>
    <p>Please take action to replenish these items.</p>
  `;

  return await sendEmail({ to, subject, html });
}

export { sendLowStockAlert };
