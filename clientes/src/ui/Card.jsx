import { cn } from "@/utils/cn.js";

export function Card({ children, className, title, subtitle }) {
  return (
    <div
      className={cn(
        "card-surface rounded-xl border p-6 shadow-xl backdrop-blur-sm",
        className
      )}
    >
      {(title || subtitle) && (
        <div className="mb-4 border-b border-primary-900/25 pb-4">
          {title ? (
            <h2 className="text-xl font-semibold">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="mt-1 text-base">{subtitle}</p>
          ) : null}
        </div>
      )}
      {children}
    </div>
  );
}
