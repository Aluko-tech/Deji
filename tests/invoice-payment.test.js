import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateInvoiceTotals } from '../src/services/invoice.service.js';
import { getIdempotentResponse, setIdempotentResponse, clearIdempotentResponse } from '../src/utils/idempotencyStore.js';

test('calculateInvoiceTotals computes subtotal tax and total correctly', () => {
  const totals = calculateInvoiceTotals(
    [
      { quantity: 2, unitPrice: 100 },
      { quantity: 1, unitPrice: 50 },
    ],
    10,
    5,
  );

  assert.equal(totals.subtotal, 250);
  assert.equal(totals.tax, 25);
  assert.equal(totals.discount, 5);
  assert.equal(totals.total, 270);
});

test('idempotency store caches and clears responses by tenant and scope', () => {
  const tenantId = 'tenant-1';
  const scope = 'invoice:create';
  const key = 'idem-123';
  const payload = { id: 'inv-1' };

  clearIdempotentResponse(tenantId, scope, key);
  assert.equal(getIdempotentResponse(tenantId, scope, key), null);

  setIdempotentResponse(tenantId, scope, key, payload);
  assert.deepEqual(getIdempotentResponse(tenantId, scope, key), payload);

  clearIdempotentResponse(tenantId, scope, key);
  assert.equal(getIdempotentResponse(tenantId, scope, key), null);
});
