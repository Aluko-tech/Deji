import prisma from '../utils/prisma.js';

export const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
};

export const handleWhatsAppWebhook = async (req, res) => {
  try {
    const data = req.body;

    if (!data.entry) return res.sendStatus(400);

    for (const entry of data.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;

        // Handle incoming message
        if (value?.messages) {
          for (const msg of value.messages) {
            const contactPhone = msg.from;
            const text = msg.text?.body || '';
            const waId = msg.id;

            // Find the contact by phone
            const contact = await prisma.contact.findFirst({
              where: {
                phone: {
                  endsWith: contactPhone, // last 10 digits usually
                },
              },
            });

            if (contact) {
              await prisma.whatsAppMessage.create({
                data: {
                  tenantId: contact.tenantId,
                  contactId: contact.id,
                  message: text,
                  direction: 'INCOMING',
                  status: 'SENT',
                  sentAt: new Date(),
                },
              });
            }
          }
        }

        // Handle message status updates
        if (value?.statuses) {
          for (const status of value.statuses) {
            const waId = status.id;
            const statusType = status.status.toUpperCase(); // e.g., delivered, read, failed

            await prisma.whatsAppMessage.updateMany({
              where: { id: waId },
              data: {
                status: statusType,
                sentAt: new Date(),
              },
            });
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
};
