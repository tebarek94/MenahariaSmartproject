import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn.js";
import { ROUTES } from "@/utils/constants.js";

const NAV_SECTIONS = [
  {
    title: "Travel",
    items: [
      { to: ROUTES.PASSENGER_DASHBOARD, label: "Dashboard", end: true },
      { to: ROUTES.PASSENGER_BOOK, label: "Book a trip", end: true },
      { to: ROUTES.PASSENGER_TICKETS, label: "My tickets", end: true },
      { to: ROUTES.PASSENGER_CARGO_TRACK, label: "Track cargo", end: true },
    ],
  },
];

export function PassengerSidebar({ open, onClose, theme = "dark" }) {
  const isLight = theme === "light";

  const linkClass = ({ isActive }) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? isLight
          ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80"
          : "bg-emerald-900/40 text-emerald-100 ring-1 ring-emerald-600/50"
        : isLight
          ? "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"
          : "text-slate-400 hover:bg-slate-800/80 hover:text-white",
    );

  const handleNav = () => onClose?.();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 backdrop-blur-sm transition-opacity md:hidden",
          isLight ? "bg-slate-900/40" : "bg-slate-950/70",
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
            to={ROUTES.PASSENGER_DASHBOARD}
            end
            className={cn(
              "text-lg font-semibold tracking-tight",
              isLight ? "text-apptext" : "text-white",
            )}
            onClick={handleNav}
          >
            Menahariya{" "}
            <span className={isLight ? "text-emerald-600" : "text-emerald-400"}>
              Passenger
            </span>
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

        <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p
                className={cn(
                  "mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider",
                  isLight ? "text-slate-500" : "text-slate-500",
                )}
              >
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
            "mt-auto shrink-0 space-y-1 border-t p-3",
            isLight ? "border-primary-200" : "border-primary-900/40",
          )}
        >
          <p
            className={cn(
              "mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider",
              isLight ? "text-slate-500" : "text-slate-500",
            )}
          >
            Account
          </p>
          <NavLink
            to={ROUTES.PASSENGER_PROFILE}
            end
            className={linkClass}
            onClick={handleNav}
          >
            Profile
          </NavLink>
          <NavLink
            to="/"
            className={cn(
              "block rounded-lg px-3 py-2 text-xs",
              isLight
                ? "text-slate-500 hover:bg-primary-50 hover:text-slate-700"
                : "text-slate-500 hover:bg-slate-800 hover:text-slate-300",
            )}
            onClick={handleNav}
          >
            ← Public home
          </NavLink>
        </div>
      </aside>
    </>
  );
}
