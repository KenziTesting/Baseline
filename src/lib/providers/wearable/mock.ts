/**
 * MockWearableProvider (spec Part 4.1) — realistic fixture data so the whole app
 * is testable without a device. Deterministic per calendar day: the same date
 * always yields the same reading (so it's stable within a day but varies across
 * days, letting you see autoregulation react). This is clearly labeled `mock`
 * so nothing downstream mistakes it for a real biometric.
 */

import type { Readiness } from "@/lib/core";
import type { WearableProvider } from "./types";

/** Stable 0..1 pseudo-random from an integer seed. */
function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000);
}

export function mockReadingForDate(date: Date): Readiness {
  const seed = dayOfYear(date) + date.getUTCFullYear() * 1000;
  const roll = seeded(seed); // 0..1

  // Recovery spread across the year: mostly moderate/high with occasional red days.
  const recovery = Math.round(28 + roll * 64); // 28..92

  const hrvBaselineMs = 62;
  const rhrBaselineBpm = 54;
  // Higher recovery ↔ higher HRV, lower RHR, more sleep, less residual strain.
  const hrvMs = Math.round(hrvBaselineMs * (0.75 + (recovery / 100) * 0.55));
  const rhrBpm = Math.round(rhrBaselineBpm * (1.12 - (recovery / 100) * 0.18));
  const sleepHours = Math.round((5.2 + (recovery / 100) * 3.2) * 10) / 10;
  const dayStrain = Math.round((6 + seeded(seed + 7) * 12) * 10) / 10;

  return {
    recovery,
    sleepHours,
    hrvMs,
    hrvBaselineMs,
    rhrBpm,
    rhrBaselineBpm,
    dayStrain,
    source: "mock",
  };
}

export class MockWearableProvider implements WearableProvider {
  readonly id = "mock";
  readonly label = "Mock WHOOP (demo data)";
  private readonly today: Date;

  constructor(today: Date = new Date()) {
    this.today = today;
  }

  isConnected(): boolean {
    return true;
  }

  async getTodayReadiness(): Promise<Readiness | null> {
    return mockReadingForDate(this.today);
  }
}
