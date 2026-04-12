import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { useTheme } from "@/contexts/ThemeContext.jsx";
import { PassengerSidebar } from "./PassengerSidebar.jsx";
import { PassengerHeader } from "./PassengerHeader.jsx";

export function PassengerLayout() {
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  const isLight = theme === "light";

  return (
    <div
      className={`flex min-h-dvh ${
        isLight
          ? "admin-theme-light bg-appbg text-apptext"
          : "admin-theme-dark bg-slate-950 bg-app-radial text-slate-100"
      }`}
    >
      <PassengerSidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        theme={theme}
      />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col md:ml-60">
        <PassengerHeader
          user={auth.user}
          onLogout={auth.logout}
          onMenuClick={openSidebar}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full min-w-0 max-w-[1680px] px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
