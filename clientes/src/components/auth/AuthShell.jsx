import { Link } from "react-router-dom";
import { cn } from "@/utils/cn.js";
import { ROUTES } from "@/utils/constants.js";

/**
 * Centered auth layout: soft glow, glass panel, minimal chrome.
 */
export function AuthShell({ eyebrow, title, children, footer, className }) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center py-10 sm:py-14",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-90"
        aria-hidden
      >
        <div className="absolute -left-32 top-10 h-72 w-72 rounded-full bg-primary-600/20 blur-[100px]" />
        <div className="absolute -right-24 bottom-16 h-64 w-64 rounded-full bg-secondary-500/15 blur-[90px]" />
      </div>

      <div className="relative w-full max-w-[400px] space-y-6">
        <header className="text-center">
          <Link
            to={ROUTES.HOME}
            className="inline-block text-sm font-medium text-slate-500 transition hover:text-slate-300"
          >
            ← Menahariya Smart
          </Link>
          {eyebrow ? (
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-400/90">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
            {title}
          </h1>
        </header>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/75 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8">
          {children}
        </div>
        {footer ? <div className="pt-1">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AuthFooterLinks({ items }) {
  return (
    <nav
      className="relative flex flex-wrap justify-center gap-4 text-sm"
      aria-label="Auth links"
    >
      {items.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="font-medium text-slate-500 transition hover:text-primary-400"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
