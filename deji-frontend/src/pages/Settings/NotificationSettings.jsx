// App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout"; // ✅ NEW layout
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Pages
import Home from "./pages/Home";
import Settings from "./pages/Settings";

// Contacts
import ContactList from "./pages/Contacts/ContactList";
import ContactForm from "./pages/Contacts/ContactForm";

// Leads
import LeadList from "./pages/Leads/LeadList";
import LeadForm from "./pages/Leads/LeadForm";

// Products
import ProductList from "./pages/Products/ProductList";
import ProductForm from "./pages/Products/ProductForm";

// Invoices
import InvoiceList from "./pages/Invoices/InvoiceList";
import InvoiceForm from "./pages/Invoices/InvoiceForm";

// Payments
import PaymentList from "./pages/Payments/PaymentList";
import PaymentForm from "./pages/Payments/PaymentForm";

// WhatsApp
import Messages from "./pages/WhatsApp/Messages";

// Inventory
import StockList from "./pages/Inventory/StockList";
import LowStockAlerts from "./pages/Inventory/LowStockAlerts";

// Ledger
import LedgerList from "./pages/Ledger/LedgerList";

export default function App() {
  return (
    <Routes>
      {/* 🟢 Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* 🔒 Protected routes inside Dashboard Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Nested dashboard routes */}
        <Route index element={<Home />} />
        <Route path="settings" element={<Settings />} />

        {/* Contacts */}
        <Route path="contacts" element={<ContactList />} />
        <Route path="contacts/new" element={<ContactForm />} />

        {/* Leads */}
        <Route path="leads" element={<LeadList />} />
        <Route path="leads/new" element={<LeadForm />} />

        {/* Products */}
        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />

        {/* Invoices */}
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/new" element={<InvoiceForm />} />

        {/* Payments */}
        <Route path="payments" element={<PaymentList />} />
        <Route path="payments/new" element={<PaymentForm />} />

        {/* WhatsApp */}
        <Route path="whatsapp" element={<Messages />} />

        {/* Inventory */}
        <Route path="inventory" element={<StockList />} />
        <Route path="inventory/low-stock" element={<LowStockAlerts />} />

        {/* Ledger */}
        <Route path="ledger" element={<LedgerList />} />
      </Route>

      {/* 🚫 Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
