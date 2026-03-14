import cron from 'node-cron';
import { fetchAndCacheRate } from '../services/currency.service.js';

// All African currencies + major global currencies
const currencies = [
  // Major Global
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'AED', 'SAR',
  // West Africa
  'NGN', 'GHS', 'XOF', 'SLL', 'GMD', 'LRD', 'MRU', 'CVE',
  // East Africa
  'KES', 'TZS', 'UGX', 'ETB', 'RWF', 'BIF', 'DJF', 'SOS', 'ERN', 'SSP',
  // North Africa
  'EGP', 'MAD', 'TND', 'DZD', 'LYD', 'SDG',
  // Southern Africa
  'ZAR', 'ZMW', 'BWP', 'MWK', 'NAD', 'SZL', 'LSL', 'MZN', 'AOA', 'ZWL',
  // Central Africa
  'XAF', 'CDF', 'STN',
];

async function updateRates() {
  console.log('🔄 Updating currency rates...');
  const baseCurrencies = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR'];
  for (let base of baseCurrencies) {
    for (let target of currencies) {
      if (base !== target) {
        await fetchAndCacheRate(base, target).catch(() => {});
      }
    }
  }
  console.log('✅ Currency rates updated.');
}

export function startCurrencyRateJob() {
  updateRates().catch(err => console.error('❌ Initial currency update failed:', err));
  cron.schedule('0 2 * * *', updateRates);
}
