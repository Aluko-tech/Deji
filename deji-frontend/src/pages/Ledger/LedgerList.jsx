import React, { useEffect, useState, useCallback } from 'react';
import { getLedgerEntries, getTrialBalance, getFinancialRatios } from '../../services/api.js';
import { AlertCircle, BarChart3, TrendingUp } from 'lucide-react';

export default function LedgerList() {
  const [entries, setEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState(null);
  const [ratios, setRatios] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    accountId: '',
    type: '',
  });

  // Fetch ledger entries
  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 50,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.accountId && { accountId: filters.accountId }),
        ...(filters.type && { type: filters.type }),
      };
      const res = await getLedgerEntries(params);
      setEntries(res.data?.data || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch (err) {
      setError('Failed to load ledger entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  // Fetch trial balance
  useEffect(() => {
    const fetchTrialBalance = async () => {
      try {
        const res = await getTrialBalance();
        setTrialBalance(res.data?.data);
      } catch (err) {
        console.error('Failed to load trial balance', err);
      }
    };

    fetchTrialBalance();
  }, []);

  // Fetch financial ratios
  useEffect(() => {
    const fetchRatios = async () => {
      try {
        const res = await getFinancialRatios();
        setRatios(res.data?.data);
      } catch (err) {
        console.error('Failed to load financial ratios', err);
      }
    };

    fetchRatios();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Ledger & Financial Reports</h1>
          <p className="text-gray-600 mt-1">Double-entry accounting ledger with financial analysis</p>
        </div>

        {/* Key Metrics */}
        {ratios && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Collection Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{ratios.paymentCollectionRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Outstanding Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₦{Number(ratios.outstandingRevenue).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Payment Percentage</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{ratios.paymentPercentage}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-medium">Avg Payment</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₦{Number(ratios.averagePaymentAmount).toLocaleString('en-NG', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Trial Balance */}
        {trialBalance && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Trial Balance</h2>
              <div className={`text-sm font-medium ${trialBalance.summary?.balanced ? 'text-green-600' : 'text-orange-600'}`}>
                {trialBalance.summary?.balanced ? '✓ Balanced' : '⚠️ Not Balanced'}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Account</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Debit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Credit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Balance</th>
                  </tr>
                </thead>
                <tbody divide-y divide-gray-200>
                  {trialBalance.accounts?.map(acc => (
                    <tr key={acc.account.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{acc.account.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ₦{acc.debit.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ₦{acc.credit.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${acc.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₦{acc.balance.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900">TOTALS</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ₦{trialBalance.summary?.totalDebits.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ₦{trialBalance.summary?.totalCredits.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">—</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters({ ...filters, endDate: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Entry Type</label>
              <select
                value={filters.type}
                onChange={(e) => {
                  setFilters({ ...filters, type: e.target.value });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ startDate: '', endDate: '', accountId: '', type: '' });
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Ledger Entries Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading ledger entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No ledger entries found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Reference</th>
                    </tr>
                  </thead>
                  <tbody divide-y divide-gray-200>
                    {entries.map(entry => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(entry.createdAt).toLocaleDateString('en-NG')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {entry.account?.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            entry.type === 'DEBIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {entry.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-sm font-semibold text-right ${
                          entry.type === 'DEBIT' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          ₦{entry.amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {entry.reference || '-'}
                        </td>
                      </tr>
                    ))}
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
