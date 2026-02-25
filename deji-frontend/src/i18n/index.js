// Comprehensive i18n with multi-language & Intl support
// Locales: en, ar-SA, fr-FR

const translations = {
  en: {
    "analytics.title": "Product Profitability",
    "analytics.overview": "Analytics Overview",
    "analytics.apply": "Apply",
    "analytics.noData": "No data for the selected range.",
    "analytics.exportCsv": "Export CSV",
    "analytics.product": "Product",
    "analytics.qty": "Quantity",
    "analytics.revenue": "Revenue",
    "analytics.cogs": "COGS",
    "analytics.otherExpenses": "Other Expenses",
    "analytics.netProfit": "Net Profit",
    "analytics.margin": "Margin %",
    "analytics.page": "Page",
    "analytics.previous": "Previous",
    "analytics.next": "Next",
    "analytics.loading": "Loading...",
    "analytics.profitByProduct": "Profit by Product",
    "analytics.revenueVsCost": "Revenue vs Cost",
    "analytics.grossMargin": "Gross Margin",
    "analytics.netMargin": "Net Margin",
    "analytics.totalRevenue": "Total Revenue",
    "analytics.totalCogs": "Total COGS",
    "analytics.totalExpenses": "Total Expenses",
    "error.unauthorized": "Unauthorized. Please check your permissions.",
    "error.invalidDateRange": "Invalid date range. Start must be before end.",
    "error.invalidProductId": "Invalid product ID.",
    "error.serverError": "Server error. Please try again later.",
    "error.forbiddenTenant": "Access denied for this tenant.",
  },
  "ar-SA": {
    "analytics.title": "ربحية المنتج",
    "analytics.overview": "نظرة عامة على التحليلات",
    "analytics.apply": "تطبيق",
    "analytics.noData": "لا توجد بيانات للنطاق المحدد.",
    "analytics.exportCsv": "تصدير CSV",
    "analytics.product": "المنتج",
    "analytics.qty": "الكمية",
    "analytics.revenue": "الإيرادات",
    "analytics.cogs": "تكلفة السلع المباعة",
    "analytics.otherExpenses": "مصاريف أخرى",
    "analytics.netProfit": "الربح الصافي",
    "analytics.margin": "الهامش %",
    "analytics.page": "صفحة",
    "analytics.previous": "السابق",
    "analytics.next": "التالي",
    "analytics.loading": "جاري التحميل...",
    "analytics.profitByProduct": "الربح حسب المنتج",
    "analytics.revenueVsCost": "الإيرادات مقابل التكلفة",
    "analytics.grossMargin": "الهامش الإجمالي",
    "analytics.netMargin": "الهامش الصافي",
    "analytics.totalRevenue": "إجمالي الإيرادات",
    "analytics.totalCogs": "إجمالي تكلفة السلع المباعة",
    "analytics.totalExpenses": "إجمالي المصاريف",
    "error.unauthorized": "غير مصرح. يرجى التحقق من أذوناتك.",
    "error.invalidDateRange": "نطاق تاريخ غير صحيح.",
    "error.invalidProductId": "معرف منتج غير صحيح.",
    "error.serverError": "خطأ في الخادم. يرجى المحاولة لاحقاً.",
    "error.forbiddenTenant": "تم رفض الوصول.",
  },
  "fr-FR": {
    "analytics.title": "Rentabilité des Produits",
    "analytics.overview": "Aperçu des Analyses",
    "analytics.apply": "Appliquer",
    "analytics.noData": "Aucune donnée pour la plage sélectionnée.",
    "analytics.exportCsv": "Exporter CSV",
    "analytics.product": "Produit",
    "analytics.qty": "Quantité",
    "analytics.revenue": "Chiffre d'affaires",
    "analytics.cogs": "Coût des ventes",
    "analytics.otherExpenses": "Autres dépenses",
    "analytics.netProfit": "Bénéfice net",
    "analytics.margin": "Marge %",
    "analytics.page": "Page",
    "analytics.previous": "Précédent",
    "analytics.next": "Suivant",
    "analytics.loading": "Chargement...",
    "analytics.profitByProduct": "Bénéfice par produit",
    "analytics.revenueVsCost": "Chiffre d'affaires vs Coût",
    "analytics.grossMargin": "Marge brute",
    "analytics.netMargin": "Marge nette",
    "analytics.totalRevenue": "Chiffre d'affaires total",
    "analytics.totalCogs": "Coût des ventes total",
    "analytics.totalExpenses": "Dépenses totales",
    "error.unauthorized": "Non autorisé.",
    "error.invalidDateRange": "Plage de dates invalide.",
    "error.invalidProductId": "ID de produit invalide.",
    "error.serverError": "Erreur serveur.",
    "error.forbiddenTenant": "Accès refusé.",
  }
};

let currentLocale = "en";
let tenantSettings = { locale: "en", timezone: "UTC", currency: "USD" };

export function setLocale(locale) {
  if (translations[locale]) currentLocale = locale;
}

export function setTenantSettings(settings) {
  tenantSettings = { ...tenantSettings, ...settings };
  if (settings.locale) setLocale(settings.locale);
}

export function getTenantSettings() {
  return tenantSettings;
}

export function t(key, fallback) {
  return (translations[currentLocale] && translations[currentLocale][key]) || fallback || key;
}

/**
 * Format number as currency using tenant settings
 */
export function formatCurrency(value, currencyOverride) {
  const currency = currencyOverride || tenantSettings.currency || "USD";
  const locale = currentLocale;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    console.warn("Currency format error:", e);
    return `${currency} ${value.toFixed(2)}`;
  }
}

/**
 * Format number as decimal using locale
 */
export function formatNumber(value, decimals = 2) {
  try {
    return new Intl.NumberFormat(currentLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch (e) {
    return value.toFixed(decimals);
  }
}

/**
 * Format date using tenant timezone
 */
export function formatDate(date, format = "short") {
  const d = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(currentLocale, {
      year: "numeric",
      month: format === "short" ? "2-digit" : "long",
      day: "2-digit",
      timeZone: tenantSettings.timezone,
    }).format(d);
  } catch (e) {
    return d.toLocaleDateString();
  }
}

export function isRTL() {
  return ["ar", "ar-SA", "he", "fa"].includes(currentLocale);
}

export default {
  t,
  setLocale,
  setTenantSettings,
  getTenantSettings,
  formatCurrency,
  formatNumber,
  formatDate,
  isRTL,
};
