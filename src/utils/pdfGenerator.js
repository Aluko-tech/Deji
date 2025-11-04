import PDFDocument from 'pdfkit';
import moment from 'moment';
import fs from 'fs';

export function generateInvoicePDF(invoice, tenant, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.id}.pdf`);

  doc.pipe(res);

  // Header
  doc
    .fontSize(20)
    .text(tenant.businessName || 'Business Name', { align: 'center' })
    .moveDown(0.5);

  doc
    .fontSize(12)
    .text(`Invoice #: ${invoice.id}`)
    .text(`Date: ${moment(invoice.date).format('YYYY-MM-DD')}`)
    .text(`Client: ${invoice.client?.name || ''}`)
    .moveDown();

  // Table Headers
  doc.fontSize(12).text('Item', 50).text('Qty', 250).text('Price', 300).text('Total', 400);
  doc.moveDown(0.5);

  // Table Items
  invoice.items.forEach((item) => {
    doc
      .text(item.name, 50)
      .text(item.quantity, 250)
      .text(`₦${item.price}`, 300)
      .text(`₦${item.total}`, 400);
  });

  doc.moveDown(1);

  // Total
  doc
    .fontSize(14)
    .text(`Subtotal: ₦${invoice.subtotal}`, { align: 'right' })
    .text(`Tax: ₦${invoice.tax || 0}`, { align: 'right' })
    .text(`Total: ₦${invoice.total}`, { align: 'right' });

  doc.end();
}
