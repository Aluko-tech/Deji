// src/services/currency.service.js
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import NodeCache from 'node-cache';

const prisma = new PrismaClient();
const API_KEY = process.env.CURRENCY_API_KEY; // Get from exchangerate.host, currencyapi.com, etc.
const API_URL = `https://api.exchangerate.host/latest`; // Free API
const cache = new NodeCache({ stdTTL: 86400 }); // cache for 1 day

// Fetch live rate & store in DB
export async function fetchAndCacheRate(base, target) {
  try {
    const res = await axios.get(`https://open.er-api.com/v6/latest/${base}`);
    const data = res.data;

    // Debug log the actual API payload
    console.log(`📡 ${base} → ${target} raw response:`, data);

    if (!data || !data.rates || !data.rates[target]) {
      throw new Error('Invalid currency response');
    }

    const rate = data.rates[target];
    cache.set(`${base}_${target}`, rate);
    return rate;

  } catch (err) {
    console.error(`❌ Failed to fetch rate ${base} → ${target}:`, err.message);
    throw err;
  }
}

export function getCachedRate(base, target) {
  return cache.get(`${base}_${target}`);
}

// Get conversion rate (cached if < 24h old)
export async function getConversionRate(base, target) {
  if (base === target) return 1;

  const existing = await prisma.currencyRate.findUnique({
    where: { base_target: { base, target } }
  });

  if (existing && (new Date() - existing.fetchedAt) < 24 * 60 * 60 * 1000) {
    return existing.rate;
  }

  return await fetchAndCacheRate(base, target);
}

// Convert an amount between currencies
export async function convertAmount(amount, from, to) {
  const rate = await getConversionRate(from, to);
  return amount * rate;
}

// Format currency properly
export function formatMoney(amount, currency, locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}
