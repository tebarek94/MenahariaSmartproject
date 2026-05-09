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
    .filter((r) => r.value > 0);
}

/**
 * SVG donut: stacked stroke segments with draw animation.
 */
export function AnimatedDonut({
  rows = [],
  size = 152,
  stroke = 16,
  className = "",
}) {
  const data = useMemo(() => normalizeRows(rows), [rows]);
  const total = useMemo(
    () => data.reduce((s, d) => s + d.value, 0),
    [data]
  );
  const [t, setT] = useState(0);

  useEffect(() => {
    setT(0);
    const start = requestAnimationFrame(() => {
      requestAnimationFrame(() => setT(1));
    });
    return () => cancelAnimationFrame(start);
  }, [rows]);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const segments = useMemo(() => {
    if (!data.length || total <= 0) return [];
    let sumBefore = 0;
    return data.map((d, i) => {
      const fullLen = (d.value / total) * circumference;
      const len = fullLen * t;
      const strokeDashoffset = -sumBefore * t;
      sumBefore += fullLen;
      return {
        key: `${d.label}-${i}`,
        label: d.label,
        value: d.value,
        color: colorAt(i),
        len,
        strokeDashoffset,
      };
    });
  }, [data, total, circumference, t]);

  if (!data.length || total === 0) {
    return (
      <div
        className={cn(
          "flex h-[152px] items-center justify-center rounded-xl border border-dashed border-primary-300/40 text-xs text-slate-500 dark:border-white/15 dark:text-slate-400",
          className
        )}
      >
        No segments
      </div>
    );
  }

  const innerR = Math.max(r - stroke * 0.85, 4);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 sm:flex-row sm:items-start",
        className
      )}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-md"
          aria-hidden
        >
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${seg.len} ${circumference}`}
                strokeDashoffset={seg.strokeDashoffset}
                style={{
                  transition:
                    "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1), stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
            ))}
          </g>
          <circle
            cx={cx}
            cy={cy}
            r={innerR}
            className="fill-white dark:fill-slate-900"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total
          </span>
          <span className="text-xl font-bold tabular-nums text-slate-800 dark:text-white">
            {Math.round(total)}
          </span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={`${d.label}-${i}`} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-sm"
              style={{ backgroundColor: colorAt(i) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">
              {d.label}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-slate-800 dark:text-slate-100">
              {d.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
