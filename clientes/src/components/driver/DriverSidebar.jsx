import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn.js";
import { ROUTES } from "@/utils/constants.js";

const DRIVER_NAV_SECTIONS = [
  {
    title: "Workspace",
    items: [
      { to: ROUTES.DRIVER_DASHBOARD, label: "Overview", end: true },
      { to: ROUTES.DRIVER_LIVE_GPS, label: "Share location", end: true },
      { to: ROUTES.DRIVER_TRIPS, label: "My trips", end: true },
      { to: ROUTES.DRIVER_PASSENGERS, label: "Passengers", end: true },
      { to: ROUTES.DRIVER_CARGO, label: "Cargo", end: true },
      { to: ROUTES.DRIVER_NOTIFICATIONS, label: "Notifications", end: true },
    ],
  },
  {
    title: "Account",
    items: [
      { to: ROUTES.DRIVER_PROFILE, label: "Profile", end: true },
    ],
  },
];

export function DriverSidebar({ open, onClose, theme }) {
  const isLight = theme === "light";
  const linkClass = ({ isActive }) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? isLight
          ? "bg-primary-100 text-primary-900 ring-1 ring-primary-300/70"
          : "bg-primary-800/50 text-primary-50 ring-1 ring-primary-600/40"
        : isLight
          ? "text-slate-600 hover:bg-primary-50 hover:text-primary-900"
          : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100",
    );

  const handleNav = () => {
    onClose?.();
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh min-h-0 w-[min(100vw-3rem,17.5rem)] flex-col border-r shadow-xl backdrop-blur-md transition-transform duration-200 ease-out",
          "md:z-20 md:w-60 md:translate-x-0 md:shadow-none",
          isLight
            ? "border-primary-200 bg-white/95"
            : "border-primary-900/40 bg-slate-900/95",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center justify-between border-b px-4 md:h-auto md:flex-col md:items-stretch md:gap-3 md:border-0 md:py-5",
            isLight ? "border-primary-200" : "border-primary-900/40",
          )}
        >
          <NavLink
            to={ROUTES.DRIVER_DASHBOARD}
            end
            className={cn(
              "text-lg font-semibold tracking-tight",
              isLight ? "text-apptext" : "text-white",
            )}
            onClick={handleNav}
          >
            Menahariya <span className="text-secondary-400">Driver</span>
          </NavLink>
          <button
            type="button"
            className={cn(
              "rounded-lg px-2 py-1 text-2xl leading-none md:hidden",
              isLight
                ? "text-slate-500 hover:bg-primary-50 hover:text-apptext"
                : "text-slate-400 hover:bg-slate-800 hover:text-white",
            )}
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {DRIVER_NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map(({ to, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={linkClass}
                    onClick={handleNav}
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            "border-t p-3",
            isLight ? "border-primary-200" : "border-primary-900/40",
          )}
        />
      </aside>
    </>
  );
}
