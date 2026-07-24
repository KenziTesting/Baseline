import type { PlayerProfile } from "./core/profile/types";

/**
 * Deterministic-engine version. Bump when any core computation changes so stored
 * DNA vectors / matches remain diffable against the engine that produced them
 * (spec Part 6: plans are stored with a version hash).
 */
export const ENGINE_VERSION = "1.0.0";

/** Stable, order-independent hash of a profile's inputs (FNV-1a over sorted JSON). */
export function hashProfileInputs(profile: PlayerProfile): string {
  const stable = stableStringify(profile);
  let h = 0x811c9dc5;
  for (let i = 0; i < stable.length; i++) {
    h ^= stable.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
