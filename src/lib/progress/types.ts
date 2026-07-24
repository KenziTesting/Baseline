/** Progress-module data types (spec Part A). */

export type ShotZone =
  | "corner3_l" | "corner3_r"
  | "wing3_l" | "wing3_r"
  | "top3"
  | "elbow_l" | "elbow_r"
  | "baseline_l" | "baseline_r"
  | "floater"
  | "rim_l" | "rim_r";

/** Zone metadata + position on a 300×280 half-court SVG (hoop at top-center). */
export interface ShotZoneDef {
  id: ShotZone;
  label: string;
  x: number;
  y: number;
}

export const SHOT_ZONES: ShotZoneDef[] = [
  { id: "corner3_l", label: "Corner 3 (L)", x: 32, y: 70 },
  { id: "corner3_r", label: "Corner 3 (R)", x: 268, y: 70 },
  { id: "wing3_l", label: "Wing 3 (L)", x: 70, y: 175 },
  { id: "wing3_r", label: "Wing 3 (R)", x: 230, y: 175 },
  { id: "top3", label: "Top of key 3", x: 150, y: 215 },
  { id: "elbow_l", label: "Elbow mid (L)", x: 100, y: 95 },
  { id: "elbow_r", label: "Elbow mid (R)", x: 200, y: 95 },
  { id: "baseline_l", label: "Baseline mid (L)", x: 55, y: 55 },
  { id: "baseline_r", label: "Baseline mid (R)", x: 245, y: 55 },
  { id: "floater", label: "Floater range", x: 150, y: 110 },
  { id: "rim_l", label: "Rim (L hand)", x: 128, y: 40 },
  { id: "rim_r", label: "Rim (R hand)", x: 172, y: 40 },
];

/** Store makes AND attempts, never just the percentage (spec A.1 — % can't aggregate). */
export interface ShotLog {
  dateISO: string;
  zone: ShotZone;
  makes: number;
  attempts: number;
}

export interface BodyMetric {
  dateISO: string;
  bodyweightKg?: number;
  /** Standing vertical, inches. */
  verticalIn?: number;
}
