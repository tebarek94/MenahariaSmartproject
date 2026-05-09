import { useEffect, useMemo, useState } from "react";
import { cn } from "@/utils/cn.js";
import { colorAt } from "./chartColors.js";

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, idx) => {
      const label = String(
        row.status ??
          row.trip_status ??
          row.cargo_status ??
          row.payment_status ??
          row.name ??
          `Item ${idx + 1}`
      );
      const raw = row.count ?? row.COUNT ?? row.cnt ?? 0;
      const value = Number(raw);
      return { label, value: Number.isFinite(value) ? value : 0 };
    })
    .filter((r) => r.label);
}

/**
 * Horizontal bar chart with width animation (CSS transition).
 */
export function AnimatedHorizontalBars({
  rows = [],
  title,
  className = "",
  barHeightClass = "h-2.5",
}) {
  const data = useMemo(() => normalizeRows(rows), [rows]);
  const total = useMemo(
    () => data.reduce((s, d) => s + d.value, 0),
    [data]
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [rows]);

  if (!data.length) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-primary-300/40 bg-white/40 px-3 py-6 text-center text-xs text-slate-500 dark:border-white/15 dark:bg-slate-900/30 dark:text-slate-400",
          className
        )}
      >
        No data yet
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {title ? (
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {title}
        </p>
      ) : null}
      <ul className="space-y-2.5">
        {data.map((d, i) => {
          const pct = total > 0 ? (d.value / total) * 100 : 0;
          const w = mounted ? pct : 0;
          return (
            <li key={`${d.label}-${i}`} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
                  {d.label}
                </span>
                <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-400">
                  {d.value}
                  <span className="ml-1 text-[0.65rem] opacity-70">
                    ({pct.toFixed(0)}%)
                  </span>
                </span>
              </div>
              <div
                className={cn(
                  "overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800/90",
                  barHeightClass
                )}
              >
                <div
                  className="h-full rounded-full shadow-sm transition-[width] duration-[900ms] ease-out"
                  style={{
                    width: `${w}%`,
                    backgroundColor: colorAt(i),
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
