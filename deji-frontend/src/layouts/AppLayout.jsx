import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // Simulate user/tenant fetch from storage or API
    const storedUser = JSON.parse(localStorage.getItem("user")) || {
      email: "user@dejiapi.com",
      avatar: "/avatar-placeholder.png",
    };
    const storedTenant = JSON.parse(localStorage.getItem("tenant")) || {
      name: "Deji API",
      logo: "/default-logo.png",
      plan: "Free",
    };
    setUser(storedUser);
    setTenant(storedTenant);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <Sidebar tenant={tenant} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 ml-60">
        <Topbar user={user} tenant={tenant} />
        <main className="p-6 mt-16">
          <Outlet context={{ user, tenant }} />
        </main>
      </div>
    </div>
  );
}
