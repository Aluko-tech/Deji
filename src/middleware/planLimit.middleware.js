// src/middleware/planLimit.middleware.js
import { getSubscription, PLAN_LIMITS, getUsage } from '../services/subscription.service.js';

/**
 * Use to block requests that exceed plan limits.
 * Example: enforceLimit('invoicesPerMonth', req => usage.invoicesThisMonth)
 */
export function enforceLimit(feature) {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

      const sub = await getSubscription(tenantId);
      const limits = PLAN_LIMITS[sub.plan];
      if (!limits) return res.status(500).json({ error: 'Plan limits not configured' });

      // boolean features (e.g., whatsappEnabled, reportsAdvanced)
      if (typeof limits[feature] === 'boolean') {
        if (!limits[feature]) {
          return res.status(403).json({ error: `Feature not available on ${sub.plan} plan` });
        }
        return next();
      }

      // numeric limits
      const usage = await getUsage(tenantId);

      // map known counters
      const counters = {
        invoicesPerMonth: usage.invoicesThisMonth,
        contactsMax: usage.contactsTotal,
        usersMax: usage.usersTotal,
      };

      const current = counters[feature];
      const max = limits[feature];

      if (typeof current === 'number' && typeof max === 'number') {
        // if this request will CREATE a new resource, we proactively block when current >= max
        if (current >= max) {
          return res.status(403).json({
            error: `Limit exceeded for ${feature}`,
            detail: `Plan ${sub.plan} allows ${max}. Current usage: ${current}.`,
          });
        }
      }

      next();
    } catch (err) {
      console.error('Plan limit middleware error:', err);
      res.status(500).json({ error: 'Failed to enforce plan limits' });
    }
  };
}
