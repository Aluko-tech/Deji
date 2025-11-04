// src/utils/currency.js
import axios from 'axios';

const RATE_API = process.env.EXCHANGE_RATE_API || 'https://api.exchangerate.host';
const CACHE_TTL_MS = Number(process.env.EXCHANGE_RATE_CACHE_TTL_MS) || 1000 * 60 * 30; // 30 minutes

// simple in-memory cache: { "USD_EUR": { rate, fetchedAt } }
const rateCache = new Map();

function cacheKey(from, to) {
  return `${from.toUpperCase()}_${to.toUpperCase()}`;
}

/**
 * Get exchange rate from -> to (float).
 * Caches results for CACHE_TTL_MS
 */
export async function getExchangeRate(from, to) {
  from = (from || 'USD').toUpperCase();
  to = (to || 'USD').toUpperCase();
  if (from === to) return 1;

  const key = cacheKey(from, to);
  const cached = rateCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rate;
  }

  try {
    const url = `${RATE_API}/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=1`;
    const { data } = await axios.get(url, { timeout: 5000 });
    // exchangerate.host returns { result: <number> }
    const rate = data?.info?.rate ?? data?.result ?? null;

    if (!rate || Number.isNaN(Number(rate))) {
      throw new Error('Invalid rate response');
    }

    rateCache.set(key, { rate: Number(rate), fetchedAt: Date.now() });
    return Number(rate);
  } catch (err) {
    console.warn('Failed to fetch exchange rate, falling back to 1:', err?.message ?? err);
    // fallback to 1 (no conversion) — better than throwing in production
    return 1;
  }
}

/**
 * Convert numeric amount from sourceCurrency to targetCurrency.
 * Returns Number with two decimal places (rounded).
 */
export async function convertCurrency(amount, fromCurrency, toCurrency) {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  const converted = Number(amount) * Number(rate);
  // round to 2 decimals
  return Math.round((converted + Number.EPSILON) * 100) / 100;
}
