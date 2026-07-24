"use client";

import type { MuscleId } from "@/lib/core";
import { fatigueColor, neglectColor } from "@/lib/fatigueColor";

/**
 * 2D SVG body map (spec D.0) — the permanent fallback and the algorithm-validation
 * checkpoint. Same taxonomy, color scale, and tap interaction as the future 3D
 * layer. A stylized schematic figure (front/back), one rect per muscle group,
 * left/right where relevant, tinted by fatigue (or "neglect" in the inverse view).
 */

interface Region {
  muscle: MuscleId;
  x: number;
  y: number;
  w: number;
  h: number;
}

const FRONT: Region[] = [
  { muscle: "anterior_deltoid", x: 60, y: 58, w: 26, h: 20 },
  { muscle: "anterior_deltoid", x: 114, y: 58, w: 26, h: 20 },
  { muscle: "pec_major", x: 74, y: 80, w: 24, h: 26 },
  { muscle: "pec_major", x: 102, y: 80, w: 24, h: 26 },
  { muscle: "biceps", x: 56, y: 104, w: 20, h: 34 },
  { muscle: "biceps", x: 124, y: 104, w: 20, h: 34 },
  { muscle: "forearm", x: 50, y: 142, w: 18, h: 40 },
  { muscle: "forearm", x: 132, y: 142, w: 18, h: 40 },
  { muscle: "obliques", x: 74, y: 112, w: 13, h: 44 },
  { muscle: "obliques", x: 113, y: 112, w: 13, h: 44 },
  { muscle: "rectus_abdominis", x: 88, y: 110, w: 24, h: 50 },
  { muscle: "adductor", x: 88, y: 192, w: 12, h: 46 },
  { muscle: "adductor", x: 100, y: 192, w: 12, h: 46 },
  { muscle: "quad", x: 74, y: 188, w: 20, h: 72 },
  { muscle: "quad", x: 106, y: 188, w: 20, h: 72 },
  { muscle: "tibialis_anterior", x: 78, y: 288, w: 16, h: 52 },
  { muscle: "tibialis_anterior", x: 106, y: 288, w: 16, h: 52 },
];

const BACK: Region[] = [
  { muscle: "upper_trap", x: 84, y: 54, w: 32, h: 16 },
  { muscle: "posterior_deltoid", x: 60, y: 62, w: 24, h: 20 },
  { muscle: "posterior_deltoid", x: 116, y: 62, w: 24, h: 20 },
  { muscle: "mid_lower_trap", x: 82, y: 78, w: 36, h: 32 },
  { muscle: "lat", x: 72, y: 96, w: 16, h: 40 },
  { muscle: "lat", x: 112, y: 96, w: 16, h: 40 },
  { muscle: "triceps", x: 54, y: 104, w: 20, h: 36 },
  { muscle: "triceps", x: 126, y: 104, w: 20, h: 36 },
  { muscle: "forearm", x: 50, y: 142, w: 18, h: 40 },
  { muscle: "forearm", x: 132, y: 142, w: 18, h: 40 },
  { muscle: "erector_spinae", x: 90, y: 112, w: 20, h: 44 },
  { muscle: "glute_med", x: 72, y: 158, w: 12, h: 20 },
  { muscle: "glute_med", x: 116, y: 158, w: 12, h: 20 },
  { muscle: "glute_max", x: 80, y: 162, w: 20, h: 30 },
  { muscle: "glute_max", x: 100, y: 162, w: 20, h: 30 },
  { muscle: "hamstring", x: 76, y: 200, w: 20, h: 60 },
  { muscle: "hamstring", x: 104, y: 200, w: 20, h: 60 },
  { muscle: "gastrocnemius", x: 78, y: 268, w: 18, h: 42 },
  { muscle: "gastrocnemius", x: 106, y: 268, w: 18, h: 42 },
  { muscle: "soleus", x: 80, y: 312, w: 14, h: 30 },
  { muscle: "soleus", x: 106, y: 312, w: 14, h: 30 },
];

export function BodyMap2D({
  view,
  values,
  mode,
  selected,
  onSelect,
}: {
  view: "front" | "back";
  /** muscle → percentage (fatigue displayedPct, or neglect %). */
  values: Partial<Record<MuscleId, number>>;
  mode: "fatigue" | "neglect";
  selected: MuscleId | null;
  onSelect: (m: MuscleId) => void;
}) {
  const regions = view === "front" ? FRONT : BACK;
  const colorFor = (m: MuscleId) => (mode === "neglect" ? neglectColor(values[m] ?? 0) : fatigueColor(values[m] ?? 0));

  return (
    <svg viewBox="0 0 200 360" width="100%" role="img" aria-label={`Body map, ${view} view`}>
      {/* neutral silhouette accents */}
      <circle cx={100} cy={30} r={17} fill="#26262e" />
      <rect x={92} y={45} width={16} height={10} rx={4} fill="#26262e" />
      {regions.map((r, i) => {
        const active = selected === r.muscle;
        const dim = selected !== null && !active;
        return (
          <rect
            key={`${r.muscle}-${i}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            rx={6}
            fill={colorFor(r.muscle)}
            fillOpacity={dim ? 0.18 : 1}
            stroke={active ? "#ffffff" : "rgba(0,0,0,0.35)"}
            strokeWidth={active ? 2 : 1}
            style={{ cursor: "pointer", transition: "fill 400ms, fill-opacity 250ms" }}
            onClick={() => onSelect(r.muscle)}
          />
        );
      })}
    </svg>
  );
}
