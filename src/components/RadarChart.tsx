"use client";

/**
 * Lightweight dependency-free SVG radar. Overlays the player's summary scores
 * against a reference archetype so the gap is visible at a glance. (Victory
 * Native / Skia charts come in Phase 5; this hand-rolled SVG keeps Phase 1 free
 * of a charting dependency.)
 */

export interface RadarSeries {
  label: string;
  color: string;
  /** Same order/length as `axes`, values 0-100. */
  values: number[];
}

export function RadarChart({
  axes,
  series,
  size = 300,
}: {
  axes: string[];
  series: RadarSeries[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 46;
  const n = axes.length;

  const pointAt = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    const r = (value / 100) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
  };

  const rings = [25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label="DNA radar chart">
      {/* grid rings */}
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes
            .map((_, i) => pointAt(i, ring).join(","))
            .join(" ")}
          fill="none"
          stroke="#26262c"
          strokeWidth={1}
        />
      ))}
      {/* spokes */}
      {axes.map((_, i) => {
        const [x, y] = pointAt(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#26262c" strokeWidth={1} />;
      })}
      {/* series */}
      {series.map((s) => (
        <polygon
          key={s.label}
          points={s.values.map((v, i) => pointAt(i, v).join(",")).join(" ")}
          fill={s.color}
          fillOpacity={0.22}
          stroke={s.color}
          strokeWidth={2}
        />
      ))}
      {/* axis labels */}
      {axes.map((label, i) => {
        const [x, y] = pointAt(i, 118);
        return (
          <text
            key={label}
            x={x}
            y={y}
            fill="#9a9aa2"
            fontSize={9}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
