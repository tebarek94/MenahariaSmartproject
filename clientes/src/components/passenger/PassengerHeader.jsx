import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/ui/Button.jsx";
import { cn } from "@/utils/cn.js";
import { ROUTES } from "@/utils/constants.js";

function MenuIcon({ className }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function SunIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3c0 0-1.21 5.79 2.42 9.42S21 12.79 21 12.79z" />
    </svg>
  );
}

const TITLES = {
  [ROUTES.PASSENGER_DASHBOARD]: "Dashboard",
  [ROUTES.PASSENGER_BOOK]: "Book a trip",
  [ROUTES.PASSENGER_TICKETS]: "My tickets",
  [ROUTES.PASSENGER_PROFILE]: "Profile",
  [ROUTES.PASSENGER_CARGO_TRACK]: "Track cargo",
};

function titleForPath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  return TITLES[path] || "Passenger";
}

export function PassengerHeader({
  user,
  onLogout,
  onMenuClick,
  theme = "dark",
  onToggleTheme,
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const title = titleForPath(pathname);
  const isLight = theme === "light";

  function handleLogout() {
    onLogout?.();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 backdrop-blur-md sm:gap-3 sm:px-4 lg:px-6",
        isLight
          ? "border-primary-200 bg-white/90"
          : "border-primary-900/40 bg-slate-950/90",
      )}
    >
      <button
        type="button"
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border md:hidden",
          isLight
            ? "border-primary-200 bg-white text-apptext hover:bg-primary-50"
            : "border-primary-900/50 bg-slate-900/80 text-slate-200 hover:bg-slate-800",
        )}
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>

      <div className="min-w-0 flex-1 basis-[min(100%,12rem)] sm:basis-auto">
        <h1
          className={cn(
            "truncate text-base font-semibold sm:text-xl",
            isLight ? "text-apptext" : "text-white",
          )}
        >
          {title}
        </h1>
      </div>

      <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <span
          className={cn(
            "hidden max-w-[160px] truncate text-sm sm:inline",
            isLight ? "text-slate-600" : "text-slate-400",
          )}
        >
          {user?.full_name || user?.phone || "Passenger"}
        </span>
        <Button
          variant={isLight ? "secondary" : "ghost"}
          className="!px-2 !py-1.5 !text-xs"
          onClick={onToggleTheme}
          type="button"
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
          title={isLight ? "Dark mode" : "Light mode"}
        >
          {isLight ? (
            <MoonIcon className="h-4 w-4" />
          ) : (
            <SunIcon className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          className="!px-2 !py-1.5 !text-xs sm:!px-3"
          onClick={handleLogout}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}
