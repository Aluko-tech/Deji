import { NavLink } from "react-router-dom";
import {
  Home, Users, Layers, Package, FileText, CreditCard,
  MessageCircle, BarChart3, Settings, Menu
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/leads", label: "Leads", icon: Layers },
  { to: "/products", label: "Products", icon: Package },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { to: "/ledger", label: "Ledger", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ tenant, sidebarOpen, setSidebarOpen }) {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg flex flex-col transition-all duration-300 ${
        sidebarOpen ? "w-60" : "w-20"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <img
            src={tenant?.logo || "/default-logo.png"}
            alt="Logo"
            className="h-8 w-8 rounded-full object-contain"
          />
          {sidebarOpen && (
            <span className="font-semibold text-lg">{tenant?.name || "Deji API"}</span>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {sidebarOpen && label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
