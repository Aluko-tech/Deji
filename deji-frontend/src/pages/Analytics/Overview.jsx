import React, { useState } from "react";
import { Link } from "react-router-dom";
import DateRangePicker from "../../components/Analytics/DateRangePicker";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

export default function AnalyticsOverview() {
  const [range, setRange] = useState({ start: null, end: null });

  const KPICard = ({ icon: Icon, label, value, color = "blue" }) => (
    <div className="p-4 bg-white rounded shadow border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className={`w-8 h-8 text-${color}-500`} />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics Overview</h1>
        <p className="text-gray-600">Monitor your business profitability and key metrics.</p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <DateRangePicker onChange={(s, e) => setRange({ start: s, end: e })} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={DollarSign} label="Total Revenue" value="$0.00" color="blue" />
        <KPICard icon={DollarSign} label="Total COGS" value="$0.00" color="red" />
        <KPICard icon={DollarSign} label="Total Expenses" value="$0.00" color="orange" />
        <KPICard icon={TrendingUp} label="Net Profit" value="$0.00" color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard icon={Percent} label="Gross Margin" value="0%" color="purple" />
        <KPICard icon={Percent} label="Net Margin" value="0%" color="indigo" />
      </div>

      {/* Quick Links */}
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link
            to="/analytics/products"
            className="px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium text-center"
          >
            Product Profitability
          </Link>
          <button className="px-4 py-3 bg-gray-300 text-gray-700 rounded font-medium cursor-not-allowed">
            Revenue vs Cost (Coming)
          </button>
          <button className="px-4 py-3 bg-gray-300 text-gray-700 rounded font-medium cursor-not-allowed">
            Expenses (Coming)
          </button>
        </div>
      </div>

      {/* Note */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded text-sm text-blue-800">
        💡 <strong>Tip:</strong> Select a date range to filter analytics data. All metrics are tenant-scoped and respect your timezone.
      </div>
    </div>
  );
}
