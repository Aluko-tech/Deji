import express from 'express';
import { getSupportedLocales } from '../controllers/localization.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/supported-locales', authenticate, getSupportedLocales, (req, res) => {
  res.json([
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' }
  ]);
});

export default router;
