import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) { return twMerge(clsx(inputs)); }

export { formatCurrency, getCurrencySymbol, getTenantCurrency, formatMoney } from "./currency.js";

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function getInitials(name = "") {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export function getLeadSourceBadge(source) {
  const map = {
    facebook_ad: { label: "Facebook", color: "badge-blue", icon: "📘" },
    instagram_ad: { label: "Instagram", color: "badge-pink", icon: "📷" },
    google_ad: { label: "Google", color: "badge-red", icon: "🔍" },
    landing_page: { label: "Landing Page", color: "badge-purple", icon: "📋" },
    ad_form: { label: "Ad Form", color: "badge-orange", icon: "📢" },
    whatsapp: { label: "WhatsApp", color: "badge-green", icon: "💬" },
    manual: { label: "Manual", color: "badge-green", icon: "✍️" },
    pos_walkin: { label: "Walk-in", color: "badge-green", icon: "🚶" },
  };
  return map[source] || { label: source || "Unknown", color: "badge-purple", icon: "📌" };
}

export function exportToCSV(rows, filename = "export.csv") {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(row =>
    headers.map(h => {
      const v = row[h];
      if (typeof v === "string" && (v.includes(",") || v.includes('"')))
        return `"${v.replace(/"/g, '""')}"`;
      return v ?? "";
    }).join(",")
  )].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
}
