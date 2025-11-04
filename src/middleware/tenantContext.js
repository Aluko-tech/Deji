// src/middleware/tenantContext.js
export const tenantContext = (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.tenantId) {
      return res.status(403).json({ error: 'Tenant context missing or invalid.' });
    }

    // Attach tenant context to all DB operations
    req.tenantId = user.tenantId;
    next();
  } catch (err) {
    console.error('Tenant context error:', err);
    res.status(500).json({ error: 'Failed to resolve tenant context.' });
  }
};
