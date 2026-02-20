import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInvoices, createPayment, getPaymentById, updatePayment } from '../../services/api.js';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function PaymentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: '',
    method: 'CASH',
    reference: '',
    notes: '',
  });

  // Fetch invoices on mount
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res = await getInvoices({ limit: 100 });
        const pendingInvoices = res.data?.data?.filter(inv => inv.status !== 'PAID') || [];
        setInvoices(pendingInvoices);
      } catch (err) {
        setError('Failed to load invoices');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Load existing payment if editing
  useEffect(() => {
    if (isEdit) {
      const loadPayment = async () => {
        try {
          setLoading(true);
          const res = await getPaymentById(id);
          const payment = res.data?.data;
          if (payment) {
            setFormData({
              invoiceId: payment.invoiceId,
              amount: payment.amount.toString(),
              method: payment.method || 'CASH',
              reference: payment.reference || '',
              notes: payment.notes || '',
            });
            // Find and set selected invoice
            const invoice = invoices.find(inv => inv.id === payment.invoiceId);
            if (invoice) setSelectedInvoice(invoice);
          }
        } catch (err) {
          setError('Failed to load payment');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      if (invoices.length > 0) {
        loadPayment();
      }
    }
  }, [isEdit, id, invoices]);

  // Update selected invoice when invoice selection changes
  useEffect(() => {
    if (formData.invoiceId) {
      const invoice = invoices.find(inv => inv.id === formData.invoiceId);
      setSelectedInvoice(invoice || null);
    } else {
      setSelectedInvoice(null);
    }
  }, [formData.invoiceId, invoices]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.invoiceId) {
      setError('Please select an invoice');
      return;
    }

    const amount = Number(formData.amount);
    if (!amount || amount <= 0) {
      setError('Payment amount must be greater than zero');
      return;
    }

    if (!selectedInvoice) {
      setError('Selected invoice not found');
      return;
    }

    const remainingBalance = selectedInvoice.total - (selectedInvoice.amountPaid || 0);
    if (amount > remainingBalance) {
      setError(`Payment amount exceeds remaining balance of ₦${remainingBalance.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`);
      return;
    }

    try {
      setSaving(true);

      const paymentData = {
        invoiceId: formData.invoiceId,
        amount: amount,
        method: formData.method,
        reference: formData.reference,
        notes: formData.notes,
      };

      if (isEdit) {
        await updatePayment(id, paymentData);
        setSuccess('Payment updated successfully!');
      } else {
        const res = await createPayment(paymentData);
        if (res.data?.success) {
          setSuccess('Payment recorded successfully!');
          // Reset form
          setTimeout(() => {
            navigate('/payments');
          }, 1500);
        }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save payment';
      setError(errorMsg);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment form...</p>
        </div>
      </div>
    );
  }

  const remainingBalance = selectedInvoice ? (selectedInvoice.total - (selectedInvoice.amountPaid || 0)) : 0;
  const paymentAmount = Number(formData.amount) || 0;
  const surplusOrDeficit = paymentAmount - remainingBalance;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/payments')}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit Payment' : 'Record Payment'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Update payment details' : 'Register a new payment against an invoice'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invoice Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice *
              </label>
              <select
                name="invoiceId"
                value={formData.invoiceId}
                onChange={handleChange}
                disabled={isEdit}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="">Select an invoice...</option>
                {invoices.map(invoice => {
                  const balance = invoice.total - (invoice.amountPaid || 0);
                  return (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber} - {invoice.contact?.name} - Balance: ₦{balance.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-500 mt-1">Select only invoices with outstanding balance</p>
            </div>

            {/* Invoice Details */}
            {selectedInvoice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Invoice Amount</p>
                    <p className="text-lg font-semibold text-blue-900">
                      ₦{selectedInvoice.total?.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Already Paid</p>
                    <p className="text-lg font-semibold text-blue-900">
                      ₦{(selectedInvoice.amountPaid || 0)?.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-blue-200">
                    <p className="text-xs text-gray-600">Remaining Balance</p>
                    <p className="text-lg font-semibold text-blue-900">
                      ₦{remainingBalance.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {paymentAmount > 0 && selectedInvoice && (
                <p className={`text-xs mt-2 ${surplusOrDeficit > 0 ? 'text-orange-600' : surplusOrDeficit < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  {surplusOrDeficit > 0 && `⚠️ Exceeds balance by ₦${surplusOrDeficit.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`}
                  {surplusOrDeficit < 0 && `✓ Remaining after this payment: ₦${Math.abs(surplusOrDeficit).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`}
                  {surplusOrDeficit === 0 && `✓ This will fully settle the invoice`}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>

            {/* Reference / Transaction ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference / Transaction ID
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                placeholder="e.g., TXN-123456 or Cheque #"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Add any additional notes about this payment..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !formData.invoiceId || !formData.amount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Processing...' : isEdit ? 'Update Payment' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
