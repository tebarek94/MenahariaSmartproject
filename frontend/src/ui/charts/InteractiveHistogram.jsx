import { useMemo, useState } from "react";
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

export function InteractiveHistogram({ rows = [], className = "" }) {
  const data = useMemo(() => {
    return normalizeRows(rows).sort((a, b) => b.value - a.value);
  }, [rows]);
  const total = useMemo(() => data.reduce((sum, x) => sum + x.value, 0), [data]);
  const maxValue = useMemo(() => Math.max(...data.map((x) => x.value), 0), [data]);
  const [activeIndex, setActiveIndex] = useState(-1);

  if (!data.length) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-primary-300/40 bg-white/40 px-3 py-6 text-center text-xs text-slate-500 dark:border-white/15 dark:bg-slate-900/30 dark:text-slate-400",
          className
        )}
      >
        No histogram data
      </div>
    );
  }

  const current = data[activeIndex] ?? data[0];
  const currentPct = total > 0 ? (current.value / total) * 100 : 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Interactive histogram
        </p>
        <p className="text-[0.72rem] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
          {current.label}: {current.value} ({currentPct.toFixed(1)}%)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {data.map((item, idx) => {
          const ratio = maxValue > 0 ? item.value / maxValue : 0;
          const h = `${Math.max(10, Math.round(ratio * 100))}%`;
          const active = idx === activeIndex || (activeIndex < 0 && idx === 0);
          return (
            <button
              key={`${item.label}-${idx}`}
              type="button"
              className={cn(
                "group rounded-lg border border-primary-200/70 bg-white/80 p-2 text-left transition-all dark:border-white/10 dark:bg-slate-900/30",
                "hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-400/70",
                active
                  ? "ring-2 ring-primary-400/60 dark:ring-primary-500/60"
                  : "ring-0"
              )}
              onMouseEnter={() => setActiveIndex(idx)}
              onFocus={() => setActiveIndex(idx)}
              onClick={() => setActiveIndex(idx)}
              aria-label={`${item.label} status count ${item.value}`}
            >
              <div className="flex h-20 items-end">
                <div className="h-full w-full rounded-md bg-slate-200/70 p-1 dark:bg-slate-800/80">
                  <div
                    className="w-full rounded-sm transition-all duration-300"
                    style={{
                      height: h,
                      backgroundColor: colorAt(idx),
                    }}
                  />
                </div>
              </div>
              <p className="mt-2 truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                {item.label}
              </p>
              <p className="text-[0.72rem] tabular-nums text-slate-600 dark:text-slate-400">
                {item.value}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
