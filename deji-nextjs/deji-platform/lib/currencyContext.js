"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { formatCurrency, getCurrencySymbol } from "./currency";
import api from "./api";

const CurrencyContext = createContext({
  currency: "NGN",
  symbol: "₦",
  format: (amt) => `₦${Number(amt||0).toLocaleString()}`,
  setCurrency: () => {},
});

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState("NGN");

  useEffect(() => {
    // Load from tenant settings
    api.get("/tenant-settings").then(res => {
      const c = res.data?.currency || "NGN";
      setCurrencyState(c);
      if (typeof window !== "undefined") {
        localStorage.setItem("deji_currency", c);
      }
    }).catch(() => {
      // Fallback to localStorage
      const saved = typeof window !== "undefined" ? localStorage.getItem("deji_currency") : null;
      if (saved) setCurrencyState(saved);
    });
  }, []);

  const setCurrency = (c) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") localStorage.setItem("deji_currency", c);
  };

  const format = (amt) => formatCurrency(amt, currency);
  const symbol = getCurrencySymbol(currency);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, format, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

// Convenience hook — just get format function
export function useFormat() {
  return useContext(CurrencyContext).format;
}
