import axios from "axios";
import { openDB as idbOpenDB } from "idb";

// Prefer VITE_API_URL, fallback to localhost or relative URL
let baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  // Auto-detect Codespaces environment
  if (typeof window !== "undefined" && window.location.hostname.includes("app.github.dev")) {
    // In GitHub Codespaces: use relative URL to proxy through frontend
    // This avoids tunnel authentication issues
    baseURL = "/api";
    console.log("🌐 Codespaces detected - Using relative backend proxy:", baseURL);
  } else {
    // Local development
    baseURL = "http://localhost:3000/api";
    console.log("💻 Local development - Using backend:", baseURL);
  }
} else {
  console.log("📌 Using VITE_API_URL:", baseURL);
}

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  // default withCredentials: true is harmless (useful if you switch to cookie auth)
  withCredentials: true,
});

console.log("🔗 API baseURL =", api.defaults.baseURL);

// Attach JWT to every request (if present)
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers = config.headers || {};
        // ensure Authorization header is set properly
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("⚠️ Could not read token from localStorage:", e);
    }
    return config;
  },
  (err) => Promise.reject(err)
);

// Handle offline POST requests with background sync (if supported)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    try {
      const shouldQueue =
        !navigator.onLine &&
        error?.config &&
        error.config.method === "post" &&
        "serviceWorker" in navigator &&
        "SyncManager" in window;

      if (shouldQueue) {
        const req = {
          url: error.config.url,
          method: error.config.method,
          body: error.config.data,
          headers: error.config.headers,
        };

        const reg = await navigator.serviceWorker.ready;
        const db = await getDB();
        const tx = db.transaction("requests", "readwrite");
        tx.store.add(req);
        await tx.done;

        await reg.sync.register("sync-requests");
        console.log("🌐 Queued request for background sync:", req.url);
      }
    } catch (e) {
      console.warn("⚠️ Error queuing request for background sync:", e);
    }

    // Improve error message for callers (so Login.jsx can show server-provided details)
    if (error?.response) {
      const serverMessage =
        error.response.data?.message || error.response.data?.error || null;
      error.message = serverMessage ? `${error.message} — ${serverMessage}` : error.message;
    }

    return Promise.reject(error);
  }
);

// IndexedDB helper (idb)
async function getDB() {
  return await idbOpenDB("request-queue", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("requests")) {
        db.createObjectStore("requests", { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

// ===== Auth helpers =====
// login(credentials) -> { token, user }
export async function login(credentials) {
  try {
    const res = await api.post("/auth/login", credentials);
    const { token, user } = res.data || {};

    if (!token || !user) {
      console.error("⚠️ Invalid login response from server", res.data);
      throw new Error("Invalid login response from server");
    }

    try {
      localStorage.setItem("token", token);
    } catch (e) {
      console.warn("⚠️ Could not save token to localStorage:", e);
    }

    return { token, user };
  } catch (err) {
    // surface useful errors for UI
    console.error("Login request failed:", err?.response?.data || err.message || err);
    throw err;
  }
}

export async function register(data) {
  return api.post("/auth/register", data);
}

export async function logout() {
  try {
    localStorage.removeItem("token");
  } catch (e) {
    console.warn("⚠️ Could not remove token from localStorage:", e);
  }
}

// ===== Contacts example =====
export async function getContacts(params = {}) {
  return api.get("/contacts", { params });
}

export async function createContact(data) {
  return api.post("/contacts", data);
}

export async function uploadLogo(formData) {
  return api.post("/uploads/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

export async function updateTenantSettings(data) {
  return api.put("/tenant-settings", data);
}

export async function getInvoices(params = {}) {
  return api.get("/invoices", { params });
}

export async function createInvoice(data) {
  return api.post("/invoices", data);
}

export async function getInvoiceById(id) {
  return api.get(`/invoices/${id}`);
}

export async function updateInvoice(id, data) {
  return api.put(`/invoices/${id}`, data);
}

export async function deleteInvoice(id) {
  return api.delete(`/invoices/${id}`);
}

// ===== Payments helpers =====
export async function getPayments(params = {}) {
  return api.get("/payments", { params });
}

export async function createPayment(data) {
  return api.post("/payments", data);
}

export async function getPaymentById(id) {
  return api.get(`/payments/${id}`);
}

export async function updatePayment(id, data) {
  return api.put(`/payments/${id}`, data);
}

export async function deletePayment(id) {
  return api.delete(`/payments/${id}`);
}

// ===== Ledger helpers =====
export async function getLedgerEntries(params = {}) {
  return api.get("/ledger/entries", { params });
}

export async function getTrialBalance() {
  return api.get("/ledger/trial-balance");
}

export async function getIncomeStatement(params = {}) {
  return api.get("/reports/income-statement", { params });
}

export async function getBalanceSheet() {
  return api.get("/reports/balance-sheet");
}

export async function getFinancialRatios() {
  return api.get("/reports/financial-ratios");
}

// ===== Reports helpers =====
export async function getDashboardOverview() {
  return api.get("/reports/overview");
}

export async function getReportSegments() {
  return api.get("/reports/segments");
}

export async function getLedgerReport(params = {}) {
  return api.get("/reports/ledger", { params });
}

export default api;
