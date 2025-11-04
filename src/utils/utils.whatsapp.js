// Fake WhatsApp API sender (to be replaced later with actual API)
export const sendWhatsAppAPI = async (phone, message) => {
  console.log(`Sending WhatsApp to ${phone}: ${message}`);
  // Simulate success
  return { success: true };
};

