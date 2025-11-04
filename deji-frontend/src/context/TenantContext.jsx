// src/context/TenantContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const TenantContext = createContext();

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);

  // Load tenant branding from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tenantBrand");
    if (saved) setTenant(JSON.parse(saved));
  }, []);

  // Dynamically apply CSS variables for brand color
  useEffect(() => {
    if (tenant?.primaryColor) {
      document.documentElement.style.setProperty("--brand", tenant.primaryColor);
      document.documentElement.style.setProperty("--brand-foreground", "#fff");
    } else {
      // fallback
      document.documentElement.style.setProperty("--brand", "#2563eb");
      document.documentElement.style.setProperty("--brand-foreground", "#fff");
    }
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, setTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
