import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/ui/Button.jsx";
import { ROUTES } from "@/utils/constants.js";

export function Header({ isAuthenticated, isAdmin, user, onLogout }) {
  const navigate = useNavigate();

  function handleLogout() {
    onLogout?.();
    navigate(ROUTES.ADMIN_LOGIN, { replace: true });
  }

  return (
    <header className="border-b border-primary-900/40 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          to={isAdmin ? ROUTES.DASHBOARD : ROUTES.ADMIN_LOGIN}
          className="text-lg font-semibold tracking-tight text-white"
        >
          Menahariya{" "}
          <span className="text-secondary-400">Smart</span>
        </Link>
        <nav className="flex items-center gap-3">
          {isAuthenticated && isAdmin ? (
            <>
              <span className="hidden text-sm text-slate-400 sm:inline">
                {user?.full_name || user?.phone || "Admin"}
              </span>
              <Link to={ROUTES.DASHBOARD}>
                <Button variant="ghost" className="!py-1.5 !text-xs">
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" className="!py-1.5 !text-xs" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : isAuthenticated ? (
            <Button variant="ghost" className="!py-1.5 !text-xs" onClick={handleLogout}>
              Log out
            </Button>
          ) : (
            <>
              <Link to={ROUTES.ADMIN_REGISTER}>
                <Button variant="ghost" className="!py-1.5 !text-xs">
                  Admin register
                </Button>
              </Link>
              <Link to={ROUTES.ADMIN_LOGIN}>
                <Button className="!py-1.5 !text-xs">Admin sign in</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
