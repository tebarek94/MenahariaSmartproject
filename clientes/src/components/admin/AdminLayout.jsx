import { useState, useCallback, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { AdminSidebar } from "./AdminSidebar.jsx";
import { AdminHeader } from "./AdminHeader.jsx";

const ADMIN_THEME_KEY = "admin_theme_mode";

export function AdminLayout() {
  const auth = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_THEME_KEY) || "dark";
    } catch {
      return "dark";
    }
  });

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_THEME_KEY, theme);
    } catch {
      // no-op
    }
  }, [theme]);

  const isLight = theme === "light";

  return (
    <div
      className={`flex min-h-dvh ${
        isLight
          ? "admin-theme-light bg-appbg"
          : "admin-theme-dark bg-slate-950 bg-app-radial text-slate-100"
      }`}
    >
      <AdminSidebar open={sidebarOpen} onClose={closeSidebar} theme={theme} />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col md:ml-60">
        <AdminHeader
          user={auth.user}
          onLogout={auth.logout}
          onMenuClick={openSidebar}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-auto p-3 text-[1rem] sm:p-4 lg:p-6">
          <div className="mx-auto w-full max-w-[1680px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
