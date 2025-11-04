import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// Auth
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Core Pages
import Home from "./pages/Home";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";

// CRM Modules
import ContactList from "./pages/Contacts/ContactList";
import ContactForm from "./pages/Contacts/ContactForm";
import LeadList from "./pages/Leads/LeadList";
import LeadForm from "./pages/Leads/LeadForm";

// ERP Modules
import ProductList from "./pages/Products/ProductList";
import ProductForm from "./pages/Products/ProductForm";
import InvoiceList from "./pages/Invoices/InvoiceList";
import InvoiceForm from "./pages/Invoices/InvoiceForm";
import PaymentList from "./pages/Payments/PaymentList";
import PaymentForm from "./pages/Payments/PaymentForm";
import LedgerList from "./pages/Ledger/LedgerList";
import StockList from "./pages/Inventory/StockList";
import LowStockAlerts from "./pages/Inventory/LowStockAlerts";

// WhatsApp
import Messages from "./pages/WhatsApp/Messages";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="home" element={<Home />} />
        <Route path="settings" element={<Settings />} />

        {/* Modules */}
        <Route path="contacts" element={<ContactList />} />
        <Route path="contacts/new" element={<ContactForm />} />

        <Route path="leads" element={<LeadList />} />
        <Route path="leads/new" element={<LeadForm />} />

        <Route path="products" element={<ProductList />} />
        <Route path="products/new" element={<ProductForm />} />

        <Route path="invoices" element={<InvoiceList />} />
        <Route path="invoices/new" element={<InvoiceForm />} />

        <Route path="payments" element={<PaymentList />} />
        <Route path="payments/new" element={<PaymentForm />} />

        <Route path="inventory" element={<StockList />} />
        <Route path="inventory/low-stock" element={<LowStockAlerts />} />

        <Route path="ledger" element={<LedgerList />} />

        <Route path="whatsapp" element={<Messages />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
