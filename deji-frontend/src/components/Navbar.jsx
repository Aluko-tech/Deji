import { Menu } from "lucide-react";

export default function Navbar({ user, setSidebarOpen }) {
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <header className="flex items-center justify-between bg-white shadow px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-2 rounded hover:bg-gray-100"
        >
          <Menu size={22} />
        </button>
        <h1 className="font-semibold text-gray-800">Welcome, {user?.email}</h1>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm"
      >
        Logout
      </button>
    </header>
  );
}
