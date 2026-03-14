import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPayments, deletePayment, getInvoices } from '../../services/api.js';
import { Plus, Edit2, Trash2, Eye, AlertCircle } from 'lucide-react';

export default function PaymentList() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ invoiceId: '', status: '', method: '' });

  // Fetch invoices for reference
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await getInvoices({ limit: 1000 });
        const invoiceMap = {};
        (res.data?.data || []).forEach(inv => {
          invoiceMap[inv.id] = inv;
        });
        setInvoices(invoiceMap);
      } catch (err) {
        console.error('Failed to load invoices', err);
      }
    };

    fetchInvoices();
  }, []);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 50,
        ...(filter.invoiceId && { invoiceId: filter.invoiceId }),
        ...(filter.method && { method: filter.method }),
      };
      const res = await getPayments(params);
      setPayments(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (err) {
      setError('Failed to load payments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    try {
      await deletePayment(id);
      setPayments(payments.filter(p => p.id !== id));
    } catch (err) {
      setError('Failed to delete payment');
      console.error(err);
    }
  };

  const getPaymentMethodBadgeColor = (method) => {
    const colors = {
      CASH: 'bg-green-100 text-green-800',
      BANK_TRANSFER: 'bg-blue-100 text-blue-800',
      CARD: 'bg-purple-100 text-purple-800',
      CHEQUE: 'bg-orange-100 text-orange-800',
      MOBILE_MONEY: 'bg-pink-100 text-pink-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600 mt-1">Manage payment records and track invoice settlements</p>
          </div>
          <button
            onClick={() => navigate('/payments/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Record Payment
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Filter by Invoice</label>
              <select
                value={filter.invoiceId}
                onChange={(e) => {
                  setFilter({ ...filter, invoiceId: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Invoices</option>
                {Object.values(invoices).map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - {inv.contact?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Filter by Method</label>
              <select
                value={filter.method}
                onChange={(e) => {
                  setFilter({ ...filter, method: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilter({ invoiceId: '', status: '', method: '' });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading payments...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No payments found. <button onClick={() => navigate('/payments/new')} className="text-blue-600 hover:underline">Record your first payment</button></p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Method</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody divide-y divide-gray-200">
                    {payments.map(payment => {
                      const invoice = invoices[payment.invoiceId];
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-gray-900">
                              {invoice?.invoiceNumber || payment.invoiceId}
                            </div>
                            <div className="text-xs text-gray-500">
                              {invoice?.contact?.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            ₦{payment.amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentMethodBadgeColor(payment.method)}`}>
                              {payment.method}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {payment.reference || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(payment.createdAt).toLocaleDateString('en-NG')}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/payments/${payment.id}`)}
                                className="p-1 hover:bg-blue-100 rounded transition"
                                title="View"
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => navigate(`/payments/${payment.id}/edit`)}
                                className="p-1 hover:bg-amber-100 rounded transition"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-amber-600" />
                              </button>
                              <button
                                onClick={() => handleDelete(payment.id)}
                                className="p-1 hover:bg-red-100 rounded transition"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
