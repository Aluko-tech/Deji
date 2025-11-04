import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  DollarSign,
  FileText,
  Users,
  AlertTriangle,
  Activity,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  YAxis,
} from "recharts";

import StatCard from "@/components/StatCard";
import ChartCard from "@/components/ChartCard";
import { getDashboardOverview } from "@/services/api";

export default function Dashboard() {
  const { user, tenant } = useOutletContext();

  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const { data } = await getDashboardOverview();

        const summary = data?.summary || {};
        const widgets = data?.widgets || {};
        const charts = data?.charts || {};

        // Stat cards
        setStats([
          {
            title: "Total Payments",
            value: `₦${summary.totalPayments?.toLocaleString() || 0}`,
            icon: DollarSign,
            color: "bg-blue-600",
          },
          {
            title: "Invoices",
            value: summary.totalInvoices || 0,
            icon: FileText,
            color: "bg-green-600",
          },
          {
            title: "Contacts",
            value: summary.totalContacts || 0,
            icon: Users,
            color: "bg-purple-600",
          },
          {
            title: "Low Stock",
            value: widgets.lowStockProducts?.length || 0,
            icon: AlertTriangle,
            color: "bg-amber-500",
          },
        ]);

        // Chart data
        setChartData(
          (charts.revenueLast30Days || []).map((item) => ({
            name: item.date,
            revenue: item.total,
          }))
        );

        // Activity feed
        setActivities(data?.activities || []);
      } catch (err) {
        console.error("Dashboard load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="p-6 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Welcome, {user?.email?.split("@")[0] || "User"} 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here’s what’s happening in{" "}
            <strong>{tenant?.name || "your business"}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 shadow-glass">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-sm">
            {tenant?.name || "Tenant"}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <p className="text-gray-500">Loading dashboard...</p>
      ) : error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : (
        <>
          {/* --- Stat Cards --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
              />
            ))}
          </div>

          {/* --- Chart + Activity --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Section */}
            <div className="lg:col-span-2">
              <ChartCard title="Revenue (Last 4 Weeks)">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Activity Feed */}
            <Card className="p-4 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold">Recent Activity</h3>
              </div>
              <div className="space-y-3 h-64 overflow-y-auto">
                {activities.length > 0 ? (
                  activities.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <div className="mt-1 w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                      <div>
                        <p className="text-gray-800 dark:text-gray-200 text-sm">
                          {item.text}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.time}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
