/**
 * Rolling personal baselines for HRV and RHR (spec Part 4.1).
 *
 * Absolute HRV/RHR numbers are meaningless without a personal baseline — an HRV
 * of 60ms is great for one athlete and poor for another. We compute a rolling
 * 30-day mean. Pure and deterministic.
 *
 * Cold start: a baseline needs history. Below `minSamples` days we mark the
 * result `reliable: false` so the caller falls back to the provider's OWN
 * recovery score (WHOOP's recovery % is already baseline-relative), rather than
 * comparing today against a baseline built from two data points.
 */

export interface DailyReading {
  dateISO: string;
  hrvMs: number;
  rhrBpm: number;
}

export interface Baselines {
  hrvBaselineMs: number;
  rhrBaselineBpm: number;
  sampleSize: number;
  reliable: boolean;
}

export interface BaselineOptions {
  windowDays?: number;
  minSamples?: number;
}

export function computeBaselines(readings: DailyReading[], opts: BaselineOptions = {}): Baselines {
  const windowDays = opts.windowDays ?? 30;
  const minSamples = opts.minSamples ?? 7;

  // Most-recent-first, take the window, keep only valid samples.
  const sorted = [...readings].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
  const window = sorted.slice(0, windowDays).filter((r) => r.hrvMs > 0 && r.rhrBpm > 0);

  const sampleSize = window.length;
  if (sampleSize === 0) {
    return { hrvBaselineMs: 0, rhrBaselineBpm: 0, sampleSize: 0, reliable: false };
  }

  const hrvBaselineMs = Math.round(mean(window.map((r) => r.hrvMs)));
  const rhrBaselineBpm = Math.round(mean(window.map((r) => r.rhrBpm)));

  return {
    hrvBaselineMs,
    rhrBaselineBpm,
    sampleSize,
    reliable: sampleSize >= minSamples,
  };
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
