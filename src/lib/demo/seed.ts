/**
 * Deterministic demo training history (~4 weeks) so the Progress module and the
 * fatigue map are populated without a device. Clearly demo — surfaced as such in
 * the UI. Seeded RNG → same history every time.
 */

import type { LoggedSet } from "@/lib/core";
import type { BodyMetric, ShotLog, ShotZone } from "@/lib/progress/types";

const DAY = 86_400_000;

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

interface DemoHistory {
  strengthLogs: LoggedSet[];
  shootingLogs: ShotLog[];
  bodyMetrics: BodyMetric[];
}

/** Three gym templates rotated across the 4 weeks (spec B.4). */
const TEMPLATE_C: { id: string; sets: number; reps?: number; load?: number; contacts?: number; rir: number }[] = [
  { id: "rfe-split-squat", sets: 4, reps: 8, load: 48, rir: 1 },
  { id: "db-reverse-lunge", sets: 3, reps: 8, load: 40, rir: 2 },
  { id: "nordic-hamstring-curl", sets: 3, reps: 5, rir: 1 },
  { id: "seated-soleus-tibialis-pair", sets: 3, reps: 18, rir: 2 },
  { id: "half-kneeling-pallof-press", sets: 3, reps: 10, rir: 2 },
];
const TEMPLATE_B: typeof TEMPLATE_C = [
  { id: "weighted-pull-up", sets: 4, reps: 5, rir: 1 },
  { id: "band-resisted-push-up", sets: 4, reps: 10, rir: 1 },
  { id: "landmine-push-press", sets: 4, reps: 5, rir: 1 },
  { id: "med-ball-rotational-scoop-toss", sets: 4, reps: 4, rir: 4 },
  { id: "seated-soleus-tibialis-pair", sets: 3, reps: 18, rir: 2 },
];
const TEMPLATE_A: typeof TEMPLATE_C = [
  { id: "trap-bar-jump", sets: 5, contacts: 3, rir: 4 },
  { id: "quarter-squat-explosive-push", sets: 4, reps: 3, load: 90, rir: 4 },
  { id: "barbell-hip-thrust", sets: 4, reps: 8, load: 100, rir: 2 },
  { id: "single-leg-rdl", sets: 3, reps: 8, load: 22, rir: 2 },
  { id: "copenhagen-plank", sets: 3, reps: 1, rir: 1 },
  { id: "banded-lateral-walk", sets: 3, reps: 12, rir: 2 },
];

// Most-recent first: yesterday = strength (Nordic → hamstrings lit), then upper, then power.
const SCHEDULE: { offsetDays: number; template: typeof TEMPLATE_C }[] = [
  { offsetDays: 1, template: TEMPLATE_C },
  { offsetDays: 3, template: TEMPLATE_B },
  { offsetDays: 5, template: TEMPLATE_A },
  { offsetDays: 8, template: TEMPLATE_C },
  { offsetDays: 10, template: TEMPLATE_B },
  { offsetDays: 12, template: TEMPLATE_A },
  { offsetDays: 15, template: TEMPLATE_C },
  { offsetDays: 17, template: TEMPLATE_B },
  { offsetDays: 19, template: TEMPLATE_A },
  { offsetDays: 22, template: TEMPLATE_C },
  { offsetDays: 24, template: TEMPLATE_B },
  { offsetDays: 26, template: TEMPLATE_A },
];

const SHOT_TARGETS: Record<ShotZone, number> = {
  corner3_l: 0.4, corner3_r: 0.42, wing3_l: 0.35, wing3_r: 0.36, top3: 0.33,
  elbow_l: 0.45, elbow_r: 0.46, baseline_l: 0.42, baseline_r: 0.41,
  floater: 0.48, rim_l: 0.58, rim_r: 0.64,
};

export function buildDemoHistory(now: number): DemoHistory {
  const rand = rng(42);
  const strengthLogs: LoggedSet[] = [];

  for (const { offsetDays, template } of SCHEDULE) {
    const ts = now - offsetDays * DAY;
    const weekIndex = Math.floor(offsetDays / 7); // 0 = most recent week
    const weekFactor = 1 - 0.025 * weekIndex; // recent sessions are heaviest → PRs trend up
    for (const item of template) {
      for (let s = 0; s < item.sets; s++) {
        strengthLogs.push({
          exerciseId: item.id,
          timestamp: ts + s * 90_000, // stagger sets slightly
          load: item.load != null ? Math.round(item.load * weekFactor) : undefined,
          reps: item.reps,
          groundContacts: item.contacts,
          rir: item.rir,
        });
      }
    }
  }

  // Shooting sessions (makes + attempts per zone), improving slightly over time.
  const shootingLogs: ShotLog[] = [];
  for (const offset of [2, 4, 9, 16, 23]) {
    const dateISO = new Date(now - offset * DAY).toISOString().slice(0, 10);
    const improve = 1 + (0.06 * (26 - offset)) / 26; // recent sessions a touch better
    for (const zone of Object.keys(SHOT_TARGETS) as ShotZone[]) {
      const attempts = 15 + Math.floor(rand() * 20);
      const pct = Math.min(0.85, SHOT_TARGETS[zone] * improve + (rand() - 0.5) * 0.08);
      shootingLogs.push({ dateISO, zone, makes: Math.round(attempts * pct), attempts });
    }
  }

  // Bodyweight every ~2 days (noisy, gentle upward trend) + a few vertical tests.
  const bodyMetrics: BodyMetric[] = [];
  for (let offset = 28; offset >= 0; offset -= 2) {
    const dateISO = new Date(now - offset * DAY).toISOString().slice(0, 10);
    const trend = 88.2 + (28 - offset) * 0.03; // ~+0.8kg over 4 weeks
    bodyMetrics.push({ dateISO, bodyweightKg: Math.round((trend + (rand() - 0.5) * 1.2) * 10) / 10 });
  }
  for (const [offset, vert] of [[26, 28], [12, 29.5], [1, 31]] as const) {
    bodyMetrics.push({ dateISO: new Date(now - offset * DAY).toISOString().slice(0, 10), verticalIn: vert });
  }

  return { strengthLogs, shootingLogs, bodyMetrics };
}
