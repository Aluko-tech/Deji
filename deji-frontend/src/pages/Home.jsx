import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import useFetch from "../hooks/useFetch";

export default function Home() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // ✅ Redirect if not logged in
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // ✅ useMemo prevents object re-creation
  const fetchOptions = useMemo(() => ({
    skip: !token,
    initialData: {
      summary: {
        totalContacts: 0,
        totalLeads: 0,
        totalProducts: 0,
        unpaidInvoices: 0,
        totalPayments: 0,
        messages: 0,
      },
      widgets: { lowStockProducts: [], threshold: 0 },
      charts: {
        revenueLast30Days: [],
        topProducts: [],
        newContacts: [],
      },
    },
  }), [token]);

  const { data: dashboard, loading, error } = useFetch("/dashboard", fetchOptions);

  console.log("📊 Dashboard data:", { dashboard, loading, error, token });

  const summary = dashboard?.summary ?? {};
  const charts = dashboard?.charts ?? {
    revenueLast30Days: [],
    topProducts: [],
    newContacts: [],
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (!token) return null;
  if (loading) return <p>Loading dashboard...</p>;
  if (error)
    return <p className="text-red-500">Failed to load dashboard metrics.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          ["Contacts", summary.totalContacts],
          ["Leads", summary.totalLeads],
          ["Products", summary.totalProducts],
          ["Unpaid Invoices", summary.unpaidInvoices],
          ["Payments", summary.totalPayments],
          ["Messages", summary.messages],
        ].map(([label, value]) => (
          <div key={label} className="p-4 bg-white shadow rounded-lg">
            <p className="text-gray-500">{label}</p>
            <p className="text-xl font-bold">{value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Revenue (last 30 days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={charts.revenueLast30Days}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Top Products</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={charts.topProducts}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sold" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* New Contacts */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">
          New Contacts (last 30 days)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={charts.newContacts}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#f59e0b"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
