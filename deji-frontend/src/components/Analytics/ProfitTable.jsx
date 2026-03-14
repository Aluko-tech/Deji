import React from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { t, formatCurrency, formatNumber, isRTL } from "../../i18n";
import { exportToCSV } from "../../utils/csvExport";

export default function ProfitTable({ rows = [], loading = false, page = 1, pageSize = 50, onPageChange = () => {} }) {
  if (loading) return <div className="p-4">{t("analytics.loading")}</div>;
  if (!rows.length) return <div className="p-4 text-gray-500">{t("analytics.noData")}</div>;

  const handleExport = () => {
    const exportData = rows.map((r) => ({
      [t("analytics.product")]: r.name || r.productName,
      [t("analytics.qty")]: r.quantitySold || r.qty_sold || 0,
      [t("analytics.revenue")]: r.revenue?.toFixed ? r.revenue.toFixed(2) : r.revenue,
      [t("analytics.cogs")]: r.cogs?.toFixed ? r.cogs.toFixed(2) : r.cogs,
      [t("analytics.otherExpenses")]: r.otherExpenses?.toFixed ? r.otherExpenses.toFixed(2) : r.otherExpenses,
      [t("analytics.netProfit")]: r.netProfit?.toFixed ? r.netProfit.toFixed(2) : r.netProfit,
      [t("analytics.margin")]: ((r.margin || 0) * 100).toFixed(2),
    }));
    exportToCSV(exportData, `product-profitability-${new Date().toISOString().split("T")[0]}.csv`);
  };

  const rtl = isRTL();

  return (
    <div className={`bg-white rounded shadow ${rtl ? "rtl" : "ltr"}`} dir={rtl ? "rtl" : "ltr"}>
      <div className={`p-4 border-b flex justify-between items-center ${rtl ? "flex-row-reverse" : ""}`}>
        <span className="font-semibold">{rows.length} {t("analytics.product", "Products")}</span>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          <Download className="w-4 h-4" />
          {t("analytics.exportCsv")}
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className={`px-4 py-2 text-sm ${rtl ? "text-right" : "text-left"}`}>{t("analytics.product")}</th>
              <th className="px-4 py-2 text-right text-sm">{t("analytics.qty")}</th>
              <th className="px-4 py-2 text-right text-sm">{t("analytics.revenue")}</th>
              <th className="px-4 py-2 text-right text-sm">{t("analytics.cogs")}</th>
              <th className="px-4 py-2 text-right text-sm">{t("analytics.otherExpenses")}</th>
              <th className="px-4 py-2 text-right text-sm">{t("analytics.netProfit")}</th>
              <th className="px-4 py-2 text-right text-sm">{t("analytics.margin")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.productId || r.id} className="hover:bg-gray-50">
                <td className={`px-4 py-2 text-sm ${rtl ? "text-right" : "text-left"}`}>{r.name || r.productName}</td>
                <td className="px-4 py-2 text-right text-sm">{formatNumber(r.quantitySold || r.qty_sold || 0, 0)}</td>
                <td className="px-4 py-2 text-right text-sm">{formatCurrency(r.revenue || 0)}</td>
                <td className="px-4 py-2 text-right text-sm">{formatCurrency(r.cogs || 0)}</td>
                <td className="px-4 py-2 text-right text-sm">{formatCurrency(r.otherExpenses || 0)}</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-green-600">{formatCurrency(r.netProfit || 0)}</td>
                <td className="px-4 py-2 text-right text-sm">{formatNumber((r.margin || 0) * 100, 2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`p-4 border-t flex justify-between items-center ${rtl ? "flex-row-reverse" : ""}`}>
        <span className="text-sm text-gray-600">{t("analytics.page")}: {page}</span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("analytics.previous")}
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            className="flex items-center gap-1 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            {t("analytics.next")}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
