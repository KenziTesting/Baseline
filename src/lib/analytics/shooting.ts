/** Shooting analytics (spec A.1). Aggregates makes/attempts — never averages percentages. */

import type { ShotLog, ShotZone } from "@/lib/progress/types";

export interface ZoneStat {
  zone: ShotZone;
  makes: number;
  attempts: number;
  pct: number | null; // null when no attempts (empty state)
}

export function aggregateZones(logs: ShotLog[]): { byZone: Record<string, ZoneStat>; overall: ZoneStat } {
  const acc = new Map<ShotZone, { makes: number; attempts: number }>();
  for (const l of logs) {
    const cur = acc.get(l.zone) ?? { makes: 0, attempts: 0 };
    cur.makes += l.makes;
    cur.attempts += l.attempts;
    acc.set(l.zone, cur);
  }
  const byZone: Record<string, ZoneStat> = {};
  let totalMakes = 0;
  let totalAttempts = 0;
  for (const [zone, v] of acc.entries()) {
    byZone[zone] = { zone, makes: v.makes, attempts: v.attempts, pct: v.attempts > 0 ? v.makes / v.attempts : null };
    totalMakes += v.makes;
    totalAttempts += v.attempts;
  }
  return {
    byZone,
    overall: { zone: "top3", makes: totalMakes, attempts: totalAttempts, pct: totalAttempts > 0 ? totalMakes / totalAttempts : null },
  };
}
