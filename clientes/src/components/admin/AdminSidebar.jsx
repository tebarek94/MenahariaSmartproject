import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn.js";
import { ROUTES } from "@/utils/constants.js";
import { ADMIN_NAV_SECTIONS } from "@/utils/adminNav.js";

export function AdminSidebar({ open, onClose, theme }) {
  const isLight = theme === "light";
  const linkClass = ({ isActive }) =>
    cn(
      "group relative flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-[0.9375rem] leading-snug transition-[color,background-color,border-color,box-shadow] duration-150",
      "font-medium tracking-tight",
      isActive
        ? isLight
          ? "border-primary-200/80 bg-primary-50 text-primary-950 shadow-sm ring-1 ring-primary-200/60"
          : "border-primary-700/50 bg-primary-950/40 text-primary-50 shadow-sm ring-1 ring-primary-600/30"
        : isLight
          ? "text-slate-700 hover:border-primary-100 hover:bg-primary-50/80 hover:text-primary-950"
          : "text-slate-300 hover:border-slate-700/80 hover:bg-slate-800/90 hover:text-white"
    );

  const handleNav = () => {
    onClose?.();
  };

  const sectionTitleClass = cn(
    "mb-2.5 mt-6 px-3 text-[11px] font-bold uppercase leading-none tracking-[0.14em] first:mt-0",
    isLight ? "text-slate-500" : "text-slate-500"
  );

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh min-h-0 w-[min(100vw-3rem,18rem)] flex-col border-r shadow-xl backdrop-blur-md transition-transform duration-200 ease-out",
          "md:z-20 md:w-[17rem] md:translate-x-0 md:shadow-none",
          isLight
            ? "border-primary-200 bg-white/95"
            : "border-primary-900/40 bg-slate-900/95",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center justify-between border-b px-4 md:h-auto md:flex-col md:items-stretch md:gap-2 md:border-0 md:px-4 md:pb-2 md:pt-5",
            isLight ? "border-primary-200" : "border-primary-900/40"
          )}
        >
          <NavLink
            to={ROUTES.DASHBOARD}
            end
            className={cn(
              "font-sans text-base font-bold tracking-tight md:text-[1.05rem]",
              isLight ? "text-apptext" : "text-white"
            )}
            onClick={handleNav}
          >
            Menahariya{" "}
            <span
              className={cn(
                "font-semibold",
                isLight ? "text-primary-600" : "text-secondary-400"
              )}
            >
              Admin
            </span>
          </NavLink>
          <p
            className={cn(
              "hidden text-[12px] font-medium leading-snug md:block",
              isLight ? "text-slate-500" : "text-slate-500"
            )}
          >
            Control center
          </p>
          <button
            type="button"
            className={cn(
              "rounded-lg px-2 py-1 text-2xl leading-none md:hidden",
              isLight
                ? "text-slate-500 hover:bg-primary-50 hover:text-apptext"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-3 pb-4 pt-1 md:px-3.5"
          aria-label="Admin navigation"
        >
          <div className="space-y-1">
            {ADMIN_NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className={sectionTitleClass}>{section.title}</p>
                <ul className="space-y-0.5">
                  {section.items.map(({ to, label, end }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={end}
                        className={linkClass}
                        onClick={handleNav}
                      >
                        <span className="min-w-0 flex-1">{label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div
          className={cn(
            "shrink-0 border-t px-4 py-3",
            isLight ? "border-primary-200" : "border-primary-900/40"
          )}
        >
          <p
            className={cn(
              "text-center text-[11px] font-medium leading-relaxed",
              isLight ? "text-slate-400" : "text-slate-600"
            )}
          >
            Menahariya Smart
          </p>
        </div>
      </aside>
    </>
  );
}
