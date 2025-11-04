// src/layouts/DashboardLayout.jsx
import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import api from "../services/api";

export default function DashboardLayout() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Fetch user and tenant info
    api.get("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => {
      setUser(res.data.user);
      setTenant(res.data.tenant);
    })
    .catch(() => {
      localStorage.removeItem("token");
      navigate("/login");
    });
}, [navigate]);

  if (!user) return <div className="p-6 text-center">Loading dashboard...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <Sidebar tenant={tenant} />

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        <Topbar user={user} tenant={tenant} />
        <main className="flex-1 p-6 mt-16 overflow-y-auto">
          <Outlet context={{ user, tenant }} />
        </main>
      </div>
    </div>
  );
}
