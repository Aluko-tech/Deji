export function toDay(v) {
  if (!v) return null;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function inRange(raw, from, to) {
  const d = toDay(raw);
  if (!d) return true;
  if (from && d < from) return false;
  if (to   && d > to)   return false;
  return true;
}

export function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
}

export function fmtDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(v) {
  if (!v) return "—";
  const diff = Date.now() - new Date(v).getTime();
  if (diff < 60000)     return "Just now";
  if (diff < 3600000)   return Math.floor(diff / 60000)    + "m ago";
  if (diff < 86400000)  return Math.floor(diff / 3600000)  + "h ago";
  if (diff < 604800000) return Math.floor(diff / 86400000) + "d ago";
  return fmtDate(v);
}