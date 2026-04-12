import { cn } from "@/utils/cn.js";

export function Card({ children, className, title, subtitle }) {
  return (
    <div
      className={cn(
        "card-surface rounded-xl border p-4 shadow-xl backdrop-blur-sm sm:p-6",
        className
      )}
    >
      {(title || subtitle) && (
        <div className="mb-4 border-b border-primary-900/25 pb-4">
          {title ? (
            <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="mt-1 text-sm leading-relaxed sm:text-base">{subtitle}</p>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}
