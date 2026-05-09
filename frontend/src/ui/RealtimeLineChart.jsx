import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function buildPolyline(values, width, height, pad) {
  if (!Array.isArray(values) || values.length === 0) return "";
  if (values.length === 1) {
    const y = height - pad;
    return `${pad},${y} ${width - pad},${y}`;
  }

  const max = Math.max(...values, 1);
  const usableW = width - pad * 2;
  const usableH = height - pad * 2;

  return values
    .map((value, idx) => {
      const x = pad + (idx / (values.length - 1)) * usableW;
      const ratio = clamp(Number(value || 0) / max, 0, 1);
      const y = pad + (1 - ratio) * usableH;
      return `${x},${y}`;
    })
    .join(" ");
}

function buildAreaPoints(values, width, height, pad) {
  const line = buildPolyline(values, width, height, pad);
  if (!line) return "";
  const bottom = height - pad;
  const parts = line.split(" ");
  const firstX = parts[0]?.split(",")[0];
  const lastX = parts[parts.length - 1]?.split(",")[0];
  if (firstX == null || lastX == null) return "";
  return `${line} ${lastX},${bottom} ${firstX},${bottom}`;
}

export function RealtimeLineChart({
  series = [],
  height = 240,
  className = "",
}) {
  const uid = useId().replace(/:/g, "");
  const active = series.filter((s) => Array.isArray(s?.values) && s.values.length);
  const width = 900;
  const pad = 28;
  const lineRefs = useRef([]);
  const [drawn, setDrawn] = useState(false);

  useLayoutEffect(() => {
    setDrawn(false);
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, [series]);

  useLayoutEffect(() => {
    if (!drawn || !active.length) return;
    lineRefs.current.forEach((el) => {
      if (!el || typeof el.getTotalLength !== "function") return;
      const len = el.getTotalLength();
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
      requestAnimationFrame(() => {
        el.style.transition =
          "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.strokeDashoffset = "0";
      });
    });
  }, [drawn, active]);

  const gridLines = useMemo(() => {
    const lines = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const y = pad + (i / steps) * (height - pad * 2);
      lines.push(
        <line
          key={`h-${i}`}
          x1={pad}
          y1={y}
          x2={width - pad}
          y2={y}
          className="stroke-slate-200/90 dark:stroke-white/[0.07]"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      );
    }
    return lines;
  }, [height, pad, width]);

  const primary = active[0];
  const areaPts = primary
    ? buildAreaPoints(primary.values, width, height, pad)
    : "";
  const primaryColor = primary?.color || "#4A90E2";

  if (!active.length) {
    return (
      <div
        className={`rounded-xl border border-primary-200/70 bg-gradient-to-b from-white/90 to-primary-50/30 p-6 text-sm text-slate-500 dark:border-white/10 dark:from-slate-900/60 dark:to-slate-950/40 dark:text-slate-400 ${className}`}
      >
        <p className="animate-pulse">Collecting live samples…</p>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-primary-200/70 bg-gradient-to-b from-white/95 to-primary-50/25 p-3 shadow-inner dark:border-white/10 dark:from-slate-900/70 dark:to-slate-950/50 ${className}`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[min(240px,42vw)] w-full max-h-[260px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridLines}
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          className="stroke-primary-300/80 dark:stroke-primary-600/50"
          strokeWidth="1.5"
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={height - pad}
          className="stroke-primary-300/80 dark:stroke-primary-600/50"
          strokeWidth="1.5"
        />
        {areaPts ? (
          <polygon
            points={areaPts}
            fill={`url(#${uid}-area)`}
            className="transition-opacity duration-500"
            style={{ opacity: drawn ? 1 : 0 }}
          />
        ) : null}
        {active.map((line, si) => (
          <polyline
            key={line.name}
            ref={(el) => {
              lineRefs.current[si] = el;
            }}
            points={buildPolyline(line.values, width, height, pad)}
            fill="none"
            stroke={line.color || "#4A90E2"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-primary-200/50 pt-3 dark:border-white/10">
        {active.map((line) => {
          const latest = line.values[line.values.length - 1] ?? 0;
          return (
            <div
              key={line.name}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-1 ring-white/30"
                style={{ backgroundColor: line.color || "#4A90E2" }}
                aria-hidden
              />
              <span className="text-p-body">
                <span className="font-medium capitalize">{line.name}</span>
                <span className="ml-1.5 tabular-nums font-bold text-primary-700 dark:text-primary-300">
                  {latest}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
