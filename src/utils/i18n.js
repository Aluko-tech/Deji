/**
 * Simple i18n (internationalization) utility for Deji API
 * -------------------------------------------------------
 *  - Loads translations from JSON files in /locales/{lang}.json
 *  - Falls back gracefully to English when missing
 *  - Supports dynamic variable interpolation using {{var}}
 *
 * Usage:
 *   import { t, setLocale, getLocale } from '../utils/i18n.js';
 *   setLocale('fr');
 *   const msg = t('subscription.upgraded', { plan: 'Pro' });
 */

import fs from 'fs';
import path from 'path';

// Determine absolute locales directory
const __dirname = path.resolve();
const localesDir = path.join(__dirname, 'src', 'locales');

// Cache loaded language packs to avoid repeated FS calls
const cache = {};

// Default language
let currentLocale = 'en';

// Helper to safely read a JSON file
function loadLocaleFile(lang) {
  try {
    const filePath = path.join(localesDir, `${lang}.json`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load locale file for ${lang}:`, err.message);
    return null;
  }
}

// Switch active locale (e.g. setLocale('fr'))
export function setLocale(lang) {
  currentLocale = lang;
  if (!cache[lang]) {
    const loaded = loadLocaleFile(lang);
    if (loaded) cache[lang] = loaded;
  }
}

// Get currently active locale
export function getLocale() {
  return currentLocale;
}

// Internal: get translation object for a given key (dot-notation)
function getNested(obj, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] ? acc[part] : null), obj);
}

/**
 * Translate a key → localized string with interpolation
 * Example: t('errors.limitExceeded', { limit: 100 })
 */
export function t(key, vars = {}, lang = currentLocale) {
  if (!cache[lang]) {
    const loaded = loadLocaleFile(lang);
    if (loaded) cache[lang] = loaded;
    else if (lang !== 'en') return t(key, vars, 'en'); // fallback
  }

  const localePack = cache[lang] || {};
  let value = getNested(localePack, key) || getNested(cache['en'] || {}, key) || key;

  // Interpolate variables
  for (const [k, v] of Object.entries(vars)) {
    value = value.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), v);
  }

  return value;
}

/**
 * Load all locales (e.g. at app startup)
 */
export function preloadLocales() {
  try {
    const files = fs.readdirSync(localesDir);
    files.forEach((file) => {
      const lang = path.basename(file, '.json');
      if (!cache[lang]) {
        const data = loadLocaleFile(lang);
        if (data) cache[lang] = data;
      }
    });
    console.log(`🌐 Loaded locales: ${Object.keys(cache).join(', ')}`);
  } catch (err) {
    console.error('Failed to preload locales:', err.message);
  }
}
