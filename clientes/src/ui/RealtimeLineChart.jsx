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

export function RealtimeLineChart({
  series = [],
  height = 220,
  className = "",
}) {
  const active = series.filter((s) => Array.isArray(s?.values) && s.values.length);
  const width = 900;
  const pad = 24;

  if (!active.length) {
    return (
      <div className={`rounded-lg border border-primary-200/70 bg-white/70 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/35 dark:text-slate-400 ${className}`}>
        Waiting for live samples...
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border border-primary-200/70 bg-white/75 p-3 dark:border-white/10 dark:bg-slate-950/40 ${className}`}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full">
        <line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          className="stroke-primary-200 dark:stroke-white/15"
          strokeWidth="1"
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={height - pad}
          className="stroke-primary-200 dark:stroke-white/15"
          strokeWidth="1"
        />
        {active.map((line) => (
          <polyline
            key={line.name}
            points={buildPolyline(line.values, width, height, pad)}
            fill="none"
            stroke={line.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {active.map((line) => {
          const latest = line.values[line.values.length - 1] ?? 0;
          return (
            <div key={line.name} className="flex items-center gap-2 text-xs sm:text-sm">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: line.color }}
                aria-hidden
              />
              <span className="text-p-body">
                {line.name}: <strong>{latest}</strong>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
