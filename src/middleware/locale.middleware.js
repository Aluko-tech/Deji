// src/middleware/locale.middleware.js
import prisma from '../config/prisma.js';

export const localeMiddleware = async (req, res, next) => {
  try {
    const { tenantId } = req.user || {};
    const queryLang = req.query.lang;
    const headerLang = req.headers['accept-language'];
    const lang = (queryLang || headerLang || 'en').split(',')[0].toLowerCase();

    if (!tenantId) {
      req.locale = { language: lang, currency: 'USD' }; // fallback
      return next();
    }

    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { language: true, currency: true }
    });

    req.locale = {
      language: tenantSettings?.language || lang,
      currency: tenantSettings?.currency || 'USD'
    };

    next();
  } catch (err) {
    console.error('❌ Failed to load locale settings:', err);
    req.locale = { language: 'en', currency: 'USD' };
    next();
  }
};
