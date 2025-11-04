// Simple hook – later we’ll replace with API/tenant settings
import { useEffect, useState } from "react";

export default function useTenantBrand() {
  const [brand, setBrand] = useState({
    name: "Deji API",
    logo: "/icons/icon-192x192.png",
    color: "#2563eb",
  });

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("tenantBrand"));
    if (saved) setBrand(saved);
  }, []);

  return brand;
}
