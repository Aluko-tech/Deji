import axios from "axios";
import { openDB } from "idb";

// Always use /api proxy on client — avoids CORS on all environments
// On server-side (SSR), call backend directly
const getBaseURL = () => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  }
  return "/api"; // Next.js proxy handles it — no CORS issues
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  withCredentials: true,
});

// Attach JWT
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (err) => Promise.reject(err));

// Response interceptor — offline queue + error handling + plan limit gates
api.interceptors.response.use((res) => res, async (error) => {
  // Offline queuing
  try {
    if (typeof window !== "undefined" && !navigator.onLine && error?.config?.method === "post" && "serviceWorker" in navigator) {
      const db = await getDB();
      await db.add("requests", { url: error.config.url, method: error.config.method, body: error.config.data, headers: error.config.headers });
      const reg = await navigator.serviceWorker.ready;
      if ("sync" in reg) await reg.sync.register("sync-requests");
    }
  } catch (e) { console.warn("Queue error:", e); }

  // 401 — token expired or invalid → redirect to login
  if (error?.response?.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }

  // 403 with upgrade:true — plan limit reached
  if (error?.response?.status === 403 && error.response.data?.upgrade === true) {
    const data = error.response.data;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("deji:plan-limit", {
        detail: {
          message: data.detail || data.error || "You've reached your plan limit.",
          feature: data.feature || "",
          plan: data.plan || "",
        },
      }));
    }
    error.message = data.detail || data.error || "Plan limit reached. Please upgrade.";
    error.isPlanLimit = true;
    return Promise.reject(error);
  }

  // Connection error — backend down
  if (!error.response) {
    error.message = "Cannot connect to server. Please check your connection.";
    return Promise.reject(error);
  }

  // Extract error message from response
  const msg = error.response.data?.message || error.response.data?.error;
  if (msg) error.message = msg;

  return Promise.reject(error);
});

async function getDB() {
  return openDB("deji-queue", 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("requests"))
        db.createObjectStore("requests", { keyPath: "id", autoIncrement: true });
    },
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(credentials) {
  const res = await api.post("/auth/login", credentials);
  const { token, user } = res.data || {};
  if (!token || !user) throw new Error("Invalid login response");
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }
  return { token, user };
}
export async function register(data) { return api.post("/auth/register", data); }
export async function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}

// ── Staff / Users ─────────────────────────────────────────────────────────────
export const getStaffMembers = ()      => api.get("/auth/users");
export const getStaffByRole  = (role)  => api.get("/auth/users", { params: { role } });
export const getStaff        = ()      => api.get("/auth/users");
export const inviteStaff     = (d)     => api.post("/auth/staff", d);
export const updateStaff     = (id, d) => api.put(`/auth/staff/${id}`, d);
export const deleteStaff     = (id)    => api.delete(`/auth/staff/${id}`);
export const resendInvite    = (id)    => api.post(`/auth/staff/${id}/resend-invite`);

// ── Contacts ──────────────────────────────────────────────────────────────────
export const getContacts   = (p = {}) => api.get("/contacts", { params: p });
export const createContact = (d)      => api.post("/contacts", d);
export const updateContact = (id, d)  => api.put(`/contacts/${id}`, d);
export const deleteContact = (id)     => api.delete(`/contacts/${id}`);

// ── Leads ─────────────────────────────────────────────────────────────────────
export const getLeads   = (p = {}) => api.get("/leads", { params: p });
export const getLead    = (id)     => api.get(`/leads/${id}`);
export const createLead = (d)      => api.post("/leads", d);
export const updateLead = (id, d)  => api.put(`/leads/${id}`, d);
export const deleteLead = (id)     => api.delete(`/leads/${id}`);

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts   = (p = {}) => api.get("/products", { params: p });
export const createProduct = (d)      => api.post("/products", d);
export const updateProduct = (id, d)  => api.put(`/products/${id}`, d);
export const deleteProduct = (id)     => api.delete(`/products/${id}`);

// ── Inventory ─────────────────────────────────────────────────────────────────
export const getInventory           = (p = {}) => api.get("/products", { params: p });
export const createInventoryProduct = (d)      => api.post("/products", d);
export const updateInventoryProduct = (id, d)  => api.put(`/products/${id}`, d);
export const deleteInventoryProduct = (id)     => api.delete(`/products/${id}`);
export const adjustStock            = (id, d)  => api.post(`/products/${id}/adjust-stock`, d);
export const getLowStock            = ()       => api.get("/products", { params: { lowStock: true } });
export const updateStock            = (id, d)  => api.put(`/products/${id}`, d);

// ── Invoices ──────────────────────────────────────────────────────────────────
export const getInvoices    = (p = {}) => api.get("/invoices", { params: p });
export const createInvoice  = (d)      => api.post("/invoices", d);
export const getInvoiceById = (id)     => api.get(`/invoices/${id}`);
export const updateInvoice  = (id, d)  => api.put(`/invoices/${id}`, d);
export const deleteInvoice  = (id)     => api.delete(`/invoices/${id}`);

// ── Payments ──────────────────────────────────────────────────────────────────
export const getPayments   = (p = {}) => api.get("/payments", { params: p });
export const createPayment = (d)      => api.post("/payments", d);
export const updatePayment = (id, d)  => api.put(`/payments/${id}`, d);
export const deletePayment = (id)     => api.delete(`/payments/${id}`);

// ── Ledger ────────────────────────────────────────────────────────────────────
export const getLedgerEntries   = (p = {}) => api.get("/ledger", { params: p });
export const createLedgerEntry  = (d)      => api.post("/ledger", d);
export const deleteLedgerEntry  = (id)     => api.delete(`/ledger/${id}`);
export const getTrialBalance    = ()       => api.get("/ledger/trial-balance");
export const getIncomeStatement = (p = {}) => api.get("/reports/income-statement", { params: p });
export const getBalanceSheet    = ()       => api.get("/reports/balance-sheet");

// ── Reports / Analytics ───────────────────────────────────────────────────────
export const getDashboardOverview  = ()       => api.get("/reports/overview");
export const getReportSegments     = ()       => api.get("/reports/segments");
export const getRevenueByProduct   = (p = {}) => api.get("/analytics/revenue-by-product", { params: p });
export const getCOGSByProduct      = (p = {}) => api.get("/analytics/cogs-by-product", { params: p });
export const getRevenueByRep       = (p = {}) => api.get("/analytics/revenue-by-rep", { params: p });
export const getAnalyticsKPIs      = (p = {}) => api.get("/analytics/kpis", { params: p });

// ── Forms ─────────────────────────────────────────────────────────────────────
export const getForms           = (p = {})          => api.get("/forms", { params: p });
export const getFormById        = (id)              => api.get(`/forms/${id}`);
export const createForm         = (d)               => api.post("/forms", d);
export const updateForm         = (id, d)           => api.put(`/forms/${id}`, d);
export const deleteForm         = (id)              => api.delete(`/forms/${id}`);
export const publishForm        = (id, isPublished) => api.post(`/forms/${id}/publish`, { isPublished });
export const getFormSubmissions = (formId, p = {})  => api.get(`/forms/${formId}/submissions`, { params: p });
export const markSubmissionRead = (id)              => api.patch(`/forms/submissions/${id}/read`);
export const submitPublicForm   = (tid, fid, data)  => api.post(`/forms/${tid}/${fid}/submit`, data);

// ── POS ───────────────────────────────────────────────────────────────────────
export const processPOSSale = (d)      => api.post("/pos/sale", d);
export const getPOSHistory  = (p = {}) => api.get("/pos/history", { params: p });

// ── Website ───────────────────────────────────────────────────────────────────
export const getWebsite          = ()  => api.get("/website");
export const updateWebsite       = (d) => api.put("/website", d);
export const publishWebsite      = ()  => api.post("/website/publish");
export const generateWebsiteCopy = (d) => api.post("/website/generate-copy", d);

// ── Tenant Settings ───────────────────────────────────────────────────────────
export const getTenantSettings    = ()   => api.get("/tenant-settings");
export const updateTenantSettings = (d)  => api.put("/tenant-settings", d);
export const uploadLogo           = (fd) => api.post("/uploads/logo",  fd, { headers: { "Content-Type": "multipart/form-data" } });
export const uploadImage          = (fd) => api.post("/uploads/image", fd, { headers: { "Content-Type": "multipart/form-data" } });

// ── Subscription ──────────────────────────────────────────────────────────────
export const getSubscription        = ()      => api.get("/subscription");
export const getSubscriptionUsage   = ()      => api.get("/subscription/usage");
export const upgradeSubscription    = (d)     => api.post("/subscription/upgrade", d);
export const cancelSubscription     = ()      => api.post("/subscription/cancel");
export const resumeSubscription     = ()      => api.post("/subscription/resume");

// ── WhatsApp ──────────────────────────────────────────────────────────────────
export const getMessages      = (p = {}) => api.get("/whatsapp/messages", { params: p });
export const sendMessage      = (d)      => api.post("/whatsapp/send", d);
export const getWebhookConfig = ()       => api.get("/webhooks/config");

// ── Warehouses ────────────────────────────────────────────────────────────────
export const getWarehouses         = (p = {}) => api.get("/warehouses", { params: p });
export const createWarehouse       = (d)      => api.post("/warehouses", d);
export const updateWarehouse       = (id, d)  => api.put(`/warehouses/${id}`, d);
export const deleteWarehouse       = (id)     => api.delete(`/warehouses/${id}`);
export const getWarehouseStock     = (id)     => api.get(`/warehouses/${id}/stock`);
export const transferStock         = (d)      => api.post("/warehouses/transfer", d);
export const getWarehouseTransfers = (p = {}) => api.get("/warehouse-transfers", { params: p });
export const createTransfer        = (d)      => api.post("/warehouse-transfers", d);
export const syncWarehouseStock    = ()       => api.post("/warehouses/sync-stock");

// ── Orders ────────────────────────────────────────────────────────────────────
export const getOrders    = (p = {}) => api.get("/orders", { params: p });
export const getOrderById = (id)     => api.get(`/orders/${id}`);
export const createOrder  = (d)      => api.post("/orders", d);
export const updateOrder  = (id, d)  => api.put(`/orders/${id}`, d);
export const deleteOrder  = (id)     => api.delete(`/orders/${id}`);

export default api;