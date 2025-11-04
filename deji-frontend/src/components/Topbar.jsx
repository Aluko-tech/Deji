import ThemeToggle from "./ThemeToggle";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DropdownMenu from "./DropdownMenu"; // assuming this component exists

export default function Topbar({ user, tenant }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const mockTenants = [
    { id: "t1", name: "Deji Global" },
    { id: "t2", name: "Timmie Kettle" },
  ];

  const handleTenantSwitch = (id) => {
    localStorage.setItem("tenant", JSON.stringify(mockTenants.find((t) => t.id === id)));
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-60 right-0 z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Tenant Switcher */}
        <DropdownMenu
          trigger={
            <div className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200">
              <img
                src={tenant?.logo || "/default-logo.png"}
                alt="Tenant Logo"
                className="w-7 h-7 rounded-full object-cover"
              />
              <span>{tenant?.name || "Select Tenant"}</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          }
        >
          <div className="py-2">
            {mockTenants.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTenantSwitch(t.id)}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700"
              >
                {t.name}
              </button>
            ))}
          </div>
        </DropdownMenu>

        {/* Right section */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <DropdownMenu
            trigger={
              <div className="flex items-center gap-2 cursor-pointer">
                <img
                  src={user?.avatar || "/avatar-placeholder.png"}
                  alt="User"
                  className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700 object-cover"
                />
                <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
            }
          >
            <div className="py-2">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm">
                <p className="font-medium">{user?.email}</p>
              </div>
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700"
              >
                <User className="w-4 h-4" /> Profile
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700"
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
