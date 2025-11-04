import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import useTenantBrand from "../hooks/useTenantBrand";

export default function AppShell({ children }) {
  const brand = useTenantBrand();

  return (
    <div className="flex h-screen w-full bg-background text-foreground dark:bg-gray-950 dark:text-gray-100 transition">
      {/* Sidebar */}
      <Sidebar brand={brand} />

      {/* Main content area */}
      <div className="flex flex-col flex-1">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-white/60 dark:bg-black/30 backdrop-blur-md shadow-glass">
          <h1 className="text-base font-medium">{brand.name}</h1>
          <ThemeToggle />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-background/60 dark:bg-gray-900/50">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
