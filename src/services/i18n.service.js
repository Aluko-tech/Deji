// src/services/i18n.service.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * t() - Translation helper
 * @param {object} req - Express request (expects req.locale)
 * @param {string} key - Translation key
 * @returns {string} - Translated string or key if not found
 */
export function t(req, key) {
  try {
    const locale = req.locale || "en";
    const filePath = path.join(__dirname, "../locales", `${locale}.json`);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Missing locale file: ${filePath}`);
      return key;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const translations = JSON.parse(content);

    return translations[key] || key;
  } catch (error) {
    console.error(`❌ i18n error for key "${key}":`, error);
    return key;
  }
}
