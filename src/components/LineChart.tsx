"use client";

import type { SeriesPoint } from "@/lib/analytics";

/**
 * Dependency-free SVG line chart. Safe with 0, 1, 2, or 400 points (spec A.3):
 * raw points as dots, an optional moving-average overlay, empty-state message.
 */
export function LineChart({
  points,
  ma,
  height = 150,
  color = "#f5a524",
  unit = "",
  emptyMessage = "No data yet.",
}: {
  points: SeriesPoint[];
  ma?: SeriesPoint[];
  height?: number;
  color?: string;
  unit?: string;
  emptyMessage?: string;
}) {
  const W = 320;
  const H = height;
  const pad = { l: 8, r: 8, t: 12, b: 8 };

  if (points.length === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-white/40">
        {emptyMessage}
      </div>
    );
  }

  const values = [...points.map((p) => p.value), ...(ma ?? []).map((p) => p.value)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = points.length;
  const x = (i: number) => pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);

  const path = (pts: SeriesPoint[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Trend chart">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={pad.l} x2={W - pad.r} y1={pad.t + g * (H - pad.t - pad.b)} y2={pad.t + g * (H - pad.t - pad.b)} stroke="#1f1f26" strokeWidth={1} />
        ))}
        {ma && ma.length > 1 && <path d={path(ma)} fill="none" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="4 3" />}
        {n > 1 && <path d={path(points)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => (
          <circle key={p.dateISO + i} cx={x(i)} cy={y(p.value)} r={n > 60 ? 1.4 : 3} fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-white/40">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
