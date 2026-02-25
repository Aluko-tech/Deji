import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { t, formatCurrency, isRTL } from "../../i18n";

export default function ProfitChart({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className="p-4 text-gray-500">{t("analytics.noData")}</div>;
  }

  const rtl = isRTL();
  const revenueLabel = t("analytics.revenue", "Revenue");
  const cogsLabel = t("analytics.cogs", "COGS");
  const profitLabel = t("analytics.netProfit", "Net Profit");

  // Prepare chart data: show name, netProfit, revenue per product
  const chartData = data.map((item) => ({
    productName: item.name || item.productName,
    [revenueLabel]: item.revenue || 0,
    [profitLabel]: item.netProfit || 0,
    [cogsLabel]: item.cogs || 0,
  }));

  // Limit to top 10 for readability
  const limited = chartData.slice(0, 10);

  // Custom tooltip to format currency
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white p-2 border border-gray-300 rounded">
          <p className="font-semibold">{payload[0].payload.productName}</p>
          {payload.map((p, i) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full h-96 bg-white rounded shadow p-4 ${rtl ? "rtl" : "ltr"}`} dir={rtl ? "rtl" : "ltr"}>
      <h3 className={`text-lg font-semibold mb-4 ${rtl ? "text-right" : "text-left"}`}>{t("analytics.profitByProduct")}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={limited} layout={rtl ? "vertical" : "horizontal"} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={rtl ? undefined : "productName"} angle={rtl ? 0 : -45} textAnchor={rtl ? "start" : "end"} height={rtl ? 5 : 100} type={rtl ? "number" : undefined} />
          <YAxis dataKey={rtl ? "productName" : undefined} type={rtl ? "category" : undefined} width={rtl ? 150 : "auto"} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey={revenueLabel} fill="#3b82f6" />
          <Bar dataKey={cogsLabel} fill="#ef4444" />
          <Bar dataKey={profitLabel} fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
