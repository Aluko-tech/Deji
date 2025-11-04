// src/jobs/currencyRates.job.js
import cron from 'node-cron';
import { fetchAndCacheRate } from '../services/currency.service.js';

const currencies = ['USD', 'EUR', 'GBP', 'NGN'];

async function updateRates() {
  console.log('🔄 Updating currency rates...');
  for (let base of currencies) {
    for (let target of currencies) {
      if (base !== target) {
        await fetchAndCacheRate(base, target);
      }
    }
  }
  console.log('✅ Currency rates updated.');
}

export function startCurrencyRateJob() {
  // Run immediately on server start
  updateRates().catch(err => console.error('❌ Initial currency update failed:', err));

  // Schedule for 2 AM daily
  cron.schedule('0 2 * * *', updateRates);
}
