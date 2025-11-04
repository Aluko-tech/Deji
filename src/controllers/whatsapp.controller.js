import prisma from '../utils/prisma.js';
import { sendWhatsAppAPI } from '../utils/sendWhatsAppAPI.js'; // real sender

export const sendWhatsAppMessage = async (req, res) => {
  const { contactId, leadId, message } = req.body;
  const { tenantId, userId } = req.user;

  const formatPhoneNumber = (phone) => {
    return phone.startsWith('+') ? phone.replace('+', '') : phone;
  };

  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const formattedPhone = formatPhoneNumber(contact.phone);

    // 🔗 Send message using Meta WhatsApp API
    const result = await sendWhatsAppAPI(formattedPhone, message);

    // 📝 Log the message
    const saved = await prisma.whatsAppMessage.create({
      data: {
        tenantId,
        contactId,
        leadId: leadId || null,
        phone: formattedPhone,
        message,
        direction: 'OUTGOING',
        status: result.success ? 'SENT' : 'FAILED',
        messageId: result.messageId || null,
        error: result.error || null,
        sentAt: result.success ? new Date() : null,
      },
    });

    res.status(200).json({
      success: true,
      meta: result.meta || null,
      log: saved,
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
};
