import { Link } from "react-router-dom";
import { cn } from "@/utils/cn.js";

/** Shared hero image — bus / transport (aligned across all auth screens). */
export const AUTH_HERO_IMAGE =
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1600&q=80&auto=format&fit=crop";

/**
 * Full-viewport auth layout: description + imagery on one side, form on the other.
 * Same palette everywhere: slate-950 / slate-900 panel, emerald accents.
 */
export function AuthShell({
  backTo = "/",
  backLabel = "← Back to home",
  imageSrc = AUTH_HERO_IMAGE,
  imageAlt = "Bus transport",
  eyebrow,
  heroTitle,
  heroDescription,
  panelTitle,
  panelSubtitle,
  children,
  footer,
  className,
}) {
  return (
    <div className={cn("min-h-screen bg-slate-950 text-slate-100", className)}>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        {/* Left (top on mobile): image + story */}
        <div className="relative min-h-[36vh] w-full lg:min-h-screen lg:w-[44%] xl:w-[42%]">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/88 to-slate-900/35 lg:bg-gradient-to-r lg:from-slate-950/20 lg:via-slate-950/80 lg:to-slate-950"
            aria-hidden
          />
          <div className="relative flex min-h-[36vh] flex-col justify-end px-6 pb-8 pt-16 sm:px-8 lg:min-h-screen lg:justify-center lg:px-10 lg:pb-12 lg:pt-12 xl:px-14">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400/95">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-3 max-w-xl text-2xl font-bold leading-[1.15] tracking-tight text-white sm:text-3xl xl:text-[2rem]">
              {heroTitle}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-[0.9375rem]">
              {heroDescription}
            </p>
          </div>
        </div>

        {/* Form column */}
        <div className="flex flex-1 flex-col justify-center bg-slate-950 px-4 py-10 sm:px-8 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-xl sm:max-w-2xl">
            <Link
              to={backTo}
              className="mb-6 inline-block text-sm font-medium text-slate-500 transition hover:text-emerald-400"
            >
              {backLabel}
            </Link>

            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-10">
              {panelTitle ? (
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {panelTitle}
                </h1>
              ) : null}
              {panelSubtitle != null && panelSubtitle !== "" ? (
                <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-400">
                  {panelSubtitle}
                </div>
              ) : null}
              <div className={cn((panelTitle || panelSubtitle) && "mt-6")}>
                {children}
              </div>
            </div>
            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthFooterLinks({ items }) {
  return (
    <nav
      className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm"
      aria-label="Auth links"
    >
      {items.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="font-medium text-slate-500 transition hover:text-emerald-400"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
