import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export const sendWhatsAppAPI = async (phone, message) => {
  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const messageId = response.data?.messages?.[0]?.id || null;

    return {
      success: true,
      messageId,
      meta: response.data,
    };
  } catch (error) {
    const errorDetails = error.response?.data || error.message;

    return {
      success: false,
      error: typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails),
    };
  }
};
