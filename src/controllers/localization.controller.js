import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '../config/localization.js';

export const getSupportedLocales = (req, res) => {
  res.json({
    languages: SUPPORTED_LANGUAGES,
    currencies: SUPPORTED_CURRENCIES,
  });
};
