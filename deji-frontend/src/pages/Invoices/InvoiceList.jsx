import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Plus, Trash2, Eye, Download, AlertTriangle } from "lucide-react";

export default function InvoiceList() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [filter, setFilter] = useState("all"); // all, pending, partially_paid, paid, cancelled

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = filter !== "all" ? { status: filter.toUpperCase() } : {};
      const response = await api.get("/invoices", { params });
      setInvoices(response.data.data?.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch invoices:", err);
      setError(err.response?.data?.error || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Handle invoice deletion
  const handleDelete = async (id) => {
    if (!window.confirm("Cancel this invoice? This action cannot be undone.")) return;

    try {
      await api.delete(`/invoices/${id}`);
      setSuccessMsg("Invoice cancelled successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchInvoices();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to cancel invoice");
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      PARTIALLY_PAID: "bg-blue-100 text-blue-800",
      PAID: "bg-green-100 text-green-800",
      CANCELLED: "bg-gray-100 text-gray-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  // Calculate totals
  const calculateBalance = (invoice) => {
    const paid = invoice.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    return invoice.total - paid;
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">📄 Invoices</h1>
            <p className="text-gray-600 mt-1">Manage and track customer invoices</p>
          </div>
          <button
            onClick={() => navigate("/invoices/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {successMsg && (
        <div className="mb-4 p-4 bg-green-100 border-l-4 border-green-600 text-green-700 rounded">
          ✅ {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border-l-4 border-red-600 text-red-700 rounded flex gap-2">
          <AlertTriangle size={20} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "partially_paid", "paid", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                filter === s
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {s === "all" ? "All Invoices" : s.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading invoices...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && invoices.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 text-lg mb-4">No invoices found</p>
          <button
            onClick={() => navigate("/invoices/new")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Create your first invoice
          </button>
        </div>
      )}

      {/* Invoices Table */}
      {!loading && invoices.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Invoice #</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Balance</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Due Date</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-blue-600">
                        {invoice.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {invoice.contact?.name || "Unknown"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {invoice.contact?.email || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        ₦{(invoice.total || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{invoice.currency}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        ₦{(calculateBalance(invoice) || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
                          invoice.status
                        )}`}
                      >
                        {invoice.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(invoice.dueDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          title="View"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          title="Download PDF"
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          title="Cancel"
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
