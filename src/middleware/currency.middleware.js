// src/middleware/currency.middleware.js
export function injectTenantCurrency(req, res, next) {
  if (req.user?.tenant?.currency) {
    req.tenantCurrency = req.user.tenant.currency;
  } else {
    req.tenantCurrency = 'USD'; // fallback
  }
  next();
}
