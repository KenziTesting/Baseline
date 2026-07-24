/**
 * Continuous fatigue color scale (spec D.3): green (fresh) → yellow → orange →
 * red (maxed). Also a "neglected" scale (inverse) for the undertrained view.
 */

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}
function rgb(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${lerp(a[0], b[0], t)}, ${lerp(a[1], b[1], t)}, ${lerp(a[2], b[2], t)})`;
}

const GREEN: [number, number, number] = [52, 211, 153];
const YELLOW: [number, number, number] = [250, 204, 21];
const ORANGE: [number, number, number] = [251, 146, 60];
const RED: [number, number, number] = [248, 113, 113];
const COOL: [number, number, number] = [59, 92, 120]; // neutral for no-data

/** pct 0-100 → color. */
export function fatigueColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct));
  if (p < 25) return rgb(GREEN, YELLOW, p / 25);
  if (p < 50) return rgb(YELLOW, ORANGE, (p - 25) / 25);
  if (p < 75) return rgb(ORANGE, RED, (p - 50) / 25);
  return rgb(RED, [220, 38, 38], (p - 75) / 25);
}

/** Neglect scale: high neglect (low training) = warm alert, well-trained = cool/calm. */
export function neglectColor(neglectPct: number): string {
  const p = Math.max(0, Math.min(100, neglectPct));
  return p < 50 ? rgb(GREEN, YELLOW, p / 50) : rgb(YELLOW, RED, (p - 50) / 50);
}

export function noDataColor(): string {
  return `rgb(${COOL[0]}, ${COOL[1]}, ${COOL[2]})`;
}

export function fatigueLabel(pct: number): string {
  if (pct < 25) return "Fresh";
  if (pct < 50) return "Moderate";
  if (pct < 75) return "Fatigued";
  return "Maxed";
}
