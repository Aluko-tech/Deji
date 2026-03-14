import { getEffectiveLimits, getUsage } from '../services/subscription.service.js';

// Map feature keys to usage counters
const FEATURE_COUNTER_MAP = {
  invoicesPerMonth:  'invoicesThisMonth',
  contactsMax:       'contactsTotal',
  leadsMax:          'leadsTotal',
  productsMax:       'productsTotal',
  usersMax:          'usersTotal',
  warehousesMax:     'warehousesTotal',
  formsMax:          'formsTotal',
};

export function enforceLimit(feature) {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ error: 'Unauthorized' });

      const limits = await getEffectiveLimits(tenantId);
      if (!limits) return res.status(500).json({ error: 'Plan limits not configured' });

      const limit = limits[feature];

      // Boolean feature gate
      if (typeof limit === 'boolean') {
        if (!limit) {
          return res.status(403).json({
            error:   `Feature not available on ${sub.plan} plan`,
            feature,
            upgrade: true,
          });
        }
        return next();
      }

      // Numeric limit — check current usage
      const counterKey = FEATURE_COUNTER_MAP[feature];
      if (!counterKey) return next(); // unknown feature, allow

      const usage   = await getUsage(tenantId);
      const current = usage[counterKey];
      const max     = limit;

      if (typeof current === 'number' && typeof max === 'number' && max < 999999) {
        if (current >= max) {
          return res.status(403).json({
            error:   `Limit reached for ${feature}`,
            detail:  `Your ${sub.plan} plan allows ${max}. Current: ${current}.`,
            upgrade: true,
            plan:    sub.plan,
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
