/**
 * Readiness + autoregulation (spec Part 3.4).
 *
 * The autoregulation rules are an EXPLICIT, editable table, not vibes. Recovery
 * zone maps to a concrete session modification, and we always surface the reason.
 * The wearable provider fills in the numbers; this module only interprets them.
 */

export type ReadinessZone = "green" | "yellow" | "red";
export type ReadinessSource = "whoop" | "mock" | "self";

export interface Readiness {
  /** 0-100 recovery score. */
  recovery: number;
  sleepHours: number;
  hrvMs: number;
  hrvBaselineMs: number;
  rhrBpm: number;
  rhrBaselineBpm: number;
  /** 0-21 day strain accumulated so far. */
  dayStrain: number;
  source: ReadinessSource;
}

export function zoneFor(recovery: number): ReadinessZone {
  if (recovery >= 67) return "green";
  if (recovery >= 34) return "yellow";
  return "red";
}

export interface Autoregulation {
  zone: ReadinessZone;
  /** Multiply set counts by this. */
  volumeMultiplier: number;
  /** 0-1 ceiling on intensity. */
  intensityCap: number;
  allowPlyo: boolean;
  allowPR: boolean;
  /** Strip strength/power; keep skill, mobility, technical shooting only. */
  skillOnly: boolean;
  /** One-line summary shown on the Today screen. */
  message: string;
  /** The data-driven "why", shown on tap. */
  reasons: string[];
}

/** Build the human-readable reasons a recovery score is low. */
function readinessReasons(r: Readiness): string[] {
  const reasons: string[] = [];
  const hrvDelta = r.hrvBaselineMs > 0 ? Math.round(((r.hrvMs - r.hrvBaselineMs) / r.hrvBaselineMs) * 100) : 0;
  if (hrvDelta <= -10) reasons.push(`HRV is ${Math.abs(hrvDelta)}% below your 30-day baseline.`);
  if (r.rhrBpm - r.rhrBaselineBpm >= 3) reasons.push(`Resting HR is up ${Math.round(r.rhrBpm - r.rhrBaselineBpm)} bpm from baseline.`);
  if (r.sleepHours < 6.5) reasons.push(`You logged ${formatHours(r.sleepHours)} of sleep.`);
  if (r.dayStrain >= 15) reasons.push(`Day strain is already ${r.dayStrain.toFixed(1)} before training.`);
  return reasons;
}

export function formatHours(h: number): string {
  const mins = Math.round(h * 60);
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, "0")}m`;
}

/**
 * The rule table (spec 3.4). Editable in one place.
 */
export function autoregulate(r: Readiness): Autoregulation {
  const zone = zoneFor(r.recovery);
  const reasons = readinessReasons(r);

  if (zone === "green") {
    return {
      zone,
      volumeMultiplier: 1.0,
      intensityCap: 1.0,
      allowPlyo: true,
      allowPR: true,
      skillOnly: false,
      message: "Green light. Run the plan as written — PR attempts and high-intensity plyos are on the table.",
      reasons: reasons.length ? reasons : ["Recovery is in a strong range."],
    };
  }
  if (zone === "yellow") {
    return {
      zone,
      volumeMultiplier: 0.8,
      intensityCap: 0.85,
      allowPlyo: true,
      allowPR: false,
      skillOnly: false,
      message: "Hold intensity, trim volume ~20%. Reduced plyo contacts, full skill work.",
      reasons: reasons.length ? reasons : ["Recovery is moderate — not a day to chase PRs."],
    };
  }
  return {
    zone,
    volumeMultiplier: 0.6,
    intensityCap: 0.6,
    allowPlyo: false,
    allowPR: false,
    skillOnly: true,
    message: "Red. Strength and power come out — today is skill, mobility, and technical shooting.",
    reasons: reasons.length ? reasons : ["Recovery is low. Push today and you dig a hole."],
  };
}
