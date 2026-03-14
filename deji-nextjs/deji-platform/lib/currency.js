// Complete multi-currency system for Deji Platform

export const CURRENCIES = {
  // Major Global
  USD: { symbol: "$",   name: "US Dollar",          flag: "🇺🇸", locale: "en-US" },
  EUR: { symbol: "€",   name: "Euro",               flag: "🇪🇺", locale: "de-DE" },
  GBP: { symbol: "£",   name: "British Pound",      flag: "🇬🇧", locale: "en-GB" },
  JPY: { symbol: "¥",   name: "Japanese Yen",       flag: "🇯🇵", locale: "ja-JP" },
  CAD: { symbol: "CA$", name: "Canadian Dollar",    flag: "🇨🇦", locale: "en-CA" },
  AUD: { symbol: "A$",  name: "Australian Dollar",  flag: "🇦🇺", locale: "en-AU" },
  CHF: { symbol: "Fr",  name: "Swiss Franc",        flag: "🇨🇭", locale: "de-CH" },
  CNY: { symbol: "¥",   name: "Chinese Yuan",       flag: "🇨🇳", locale: "zh-CN" },
  AED: { symbol: "د.إ", name: "UAE Dirham",         flag: "🇦🇪", locale: "ar-AE" },
  SAR: { symbol: "﷼",   name: "Saudi Riyal",        flag: "🇸🇦", locale: "ar-SA" },
  INR: { symbol: "₹",   name: "Indian Rupee",       flag: "🇮🇳", locale: "en-IN" },

  // West Africa
  NGN: { symbol: "₦",   name: "Nigerian Naira",     flag: "🇳🇬", locale: "en-NG" },
  GHS: { symbol: "₵",   name: "Ghanaian Cedi",      flag: "🇬🇭", locale: "en-GH" },
  XOF: { symbol: "CFA", name: "West African CFA",   flag: "🌍", locale: "fr-SN" },
  SLL: { symbol: "Le",  name: "Sierra Leonean Leone",flag: "🇸🇱", locale: "en-SL" },
  GMD: { symbol: "D",   name: "Gambian Dalasi",     flag: "🇬🇲", locale: "en-GM" },
  LRD: { symbol: "L$",  name: "Liberian Dollar",    flag: "🇱🇷", locale: "en-LR" },
  MRU: { symbol: "UM",  name: "Mauritanian Ouguiya",flag: "🇲🇷", locale: "ar-MR" },
  CVE: { symbol: "$",   name: "Cape Verdean Escudo",flag: "🇨🇻", locale: "pt-CV" },

  // East Africa
  KES: { symbol: "KSh", name: "Kenyan Shilling",    flag: "🇰🇪", locale: "en-KE" },
  TZS: { symbol: "TSh", name: "Tanzanian Shilling", flag: "🇹🇿", locale: "sw-TZ" },
  UGX: { symbol: "USh", name: "Ugandan Shilling",   flag: "🇺🇬", locale: "en-UG" },
  ETB: { symbol: "Br",  name: "Ethiopian Birr",     flag: "🇪🇹", locale: "am-ET" },
  RWF: { symbol: "RF",  name: "Rwandan Franc",      flag: "🇷🇼", locale: "rw-RW" },
  BIF: { symbol: "Fr",  name: "Burundian Franc",    flag: "🇧🇮", locale: "fr-BI" },
  DJF: { symbol: "Fdj", name: "Djiboutian Franc",   flag: "🇩🇯", locale: "fr-DJ" },
  SOS: { symbol: "Sh",  name: "Somali Shilling",    flag: "🇸🇴", locale: "so-SO" },
  SSP: { symbol: "£",   name: "South Sudanese Pound",flag: "🇸🇸", locale: "en-SS" },

  // North Africa
  EGP: { symbol: "E£",  name: "Egyptian Pound",     flag: "🇪🇬", locale: "ar-EG" },
  MAD: { symbol: "د.م.", name: "Moroccan Dirham",   flag: "🇲🇦", locale: "ar-MA" },
  TND: { symbol: "د.ت", name: "Tunisian Dinar",     flag: "🇹🇳", locale: "ar-TN" },
  DZD: { symbol: "د.ج", name: "Algerian Dinar",     flag: "🇩🇿", locale: "ar-DZ" },
  LYD: { symbol: "ل.د", name: "Libyan Dinar",       flag: "🇱🇾", locale: "ar-LY" },
  SDG: { symbol: "ج.س.", name: "Sudanese Pound",    flag: "🇸🇩", locale: "ar-SD" },

  // Southern Africa
  ZAR: { symbol: "R",   name: "South African Rand", flag: "🇿🇦", locale: "en-ZA" },
  ZMW: { symbol: "ZK",  name: "Zambian Kwacha",     flag: "🇿🇲", locale: "en-ZM" },
  BWP: { symbol: "P",   name: "Botswana Pula",      flag: "🇧🇼", locale: "en-BW" },
  MWK: { symbol: "MK",  name: "Malawian Kwacha",    flag: "🇲🇼", locale: "en-MW" },
  NAD: { symbol: "N$",  name: "Namibian Dollar",    flag: "🇳🇦", locale: "en-NA" },
  MZN: { symbol: "MT",  name: "Mozambican Metical", flag: "🇲🇿", locale: "pt-MZ" },
  AOA: { symbol: "Kz",  name: "Angolan Kwanza",     flag: "🇦🇴", locale: "pt-AO" },
  ZWL: { symbol: "Z$",  name: "Zimbabwean Dollar",  flag: "🇿🇼", locale: "en-ZW" },
  MGA: { symbol: "Ar",  name: "Malagasy Ariary",    flag: "🇲🇬", locale: "mg-MG" },
  SCR: { symbol: "₨",   name: "Seychellois Rupee",  flag: "🇸🇨", locale: "en-SC" },
  MUR: { symbol: "₨",   name: "Mauritian Rupee",    flag: "🇲🇺", locale: "en-MU" },

  // Central Africa
  XAF: { symbol: "FCFA",name: "Central African CFA",flag: "🌍", locale: "fr-CM" },
  CDF: { symbol: "FC",  name: "Congolese Franc",    flag: "🇨🇩", locale: "fr-CD" },
};

// Grouped for UI display
export const CURRENCY_GROUPS = {
  "🌍 West Africa":    ["NGN","GHS","XOF","SLL","GMD","LRD","MRU","CVE"],
  "🌍 East Africa":    ["KES","TZS","UGX","ETB","RWF","BIF","DJF","SOS","SSP"],
  "🌍 North Africa":   ["EGP","MAD","TND","DZD","LYD","SDG"],
  "🌍 Southern Africa":["ZAR","ZMW","BWP","MWK","NAD","MZN","AOA","ZWL","MGA","SCR","MUR"],
  "🌍 Central Africa": ["XAF","CDF"],
  "🌐 Global":         ["USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY","AED","SAR","INR"],
};

/**
 * Format currency amount with correct symbol and locale
 */
export function formatCurrency(amount, currencyCode = "NGN") {
  const currency = CURRENCIES[currencyCode];
  if (!currency) return `${currencyCode} ${Number(amount || 0).toLocaleString()}`;

  const num = Number(amount || 0);
  const formatted = num.toLocaleString(currency.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return `${currency.symbol}${formatted}`;
}

/**
 * Get currency symbol only
 */
export function getCurrencySymbol(currencyCode = "NGN") {
  return CURRENCIES[currencyCode]?.symbol || currencyCode;
}

/**
 * Get currency display name with flag
 */
export function getCurrencyLabel(currencyCode) {
  const c = CURRENCIES[currencyCode];
  if (!c) return currencyCode;
  return `${c.flag} ${currencyCode} — ${c.name}`;
}

/**
 * Get tenant currency from localStorage
 */
export function getTenantCurrency() {
  if (typeof window === "undefined") return "NGN";
  try {
    const settings = JSON.parse(localStorage.getItem("tenantSettings") || "{}");
    return settings.currency || "NGN";
  } catch {
    return "NGN";
  }
}

/**
 * Format with tenant currency
 */
export function formatMoney(amount) {
  return formatCurrency(amount, getTenantCurrency());
}
