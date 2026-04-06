import { Outlet } from "react-router-dom";
import { Header } from "./Header.jsx";

export function MainLayout({ isAuthenticated, isAdmin, user, onLogout }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 bg-app-radial">
      <Header
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        user={user}
        onLogout={onLogout}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-primary-900/30 py-6 text-center text-xs text-slate-500">
        <span className="text-primary-500/90">Menahariya</span>{" "}
        <span className="text-secondary-500/90">Smart</span>
        <span className="text-slate-500"> · React + Tailwind</span>
      </footer>
    </div>
  );
}
