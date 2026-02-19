import NodeCache from 'node-cache';

const store = new NodeCache({ stdTTL: 60 * 60, checkperiod: 120 });

const toKey = (tenantId, scope, idempotencyKey) => `${tenantId}:${scope}:${idempotencyKey}`;

export function getIdempotentResponse(tenantId, scope, idempotencyKey) {
  if (!idempotencyKey) return null;
  return store.get(toKey(tenantId, scope, idempotencyKey)) || null;
}

export function setIdempotentResponse(tenantId, scope, idempotencyKey, response) {
  if (!idempotencyKey) return;
  store.set(toKey(tenantId, scope, idempotencyKey), response);
}

export function clearIdempotentResponse(tenantId, scope, idempotencyKey) {
  if (!idempotencyKey) return;
  store.del(toKey(tenantId, scope, idempotencyKey));
}
