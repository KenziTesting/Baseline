/**
 * Channel allowlist (spec C.3), weighted for ranking.
 *
 * Handles are stable and public. Channel IDs are resolved from handles via the
 * YouTube API (`channels.list?forHandle`) by `scripts/curate-videos.ts` — we do
 * NOT guess UC-ids. `channelId` is filled only where verified from an
 * authoritative youtube.com/channel/UC… URL; the rest are resolved at curation
 * time and written back. Until resolved, ranking falls back to title/duration.
 */

export interface AllowlistedChannel {
  name: string;
  handle: string;
  /** Verified UC-id, or "" until the curation script resolves the handle. */
  channelId: string;
  weight: number;
  topic: "strength" | "basketball";
}

export const CHANNEL_ALLOWLIST: AllowlistedChannel[] = [
  { name: "Jeff Nippard", handle: "@JeffNippard", channelId: "UC68TLK0mAEzUyHx5x5k-S1Q", weight: 0.9, topic: "strength" }, // verified via youtube.com/channel URL
  { name: "Squat University", handle: "@SquatUniversity", channelId: "", weight: 1.0, topic: "strength" },
  { name: "Barbell Medicine", handle: "@BarbellMedicine", channelId: "", weight: 1.0, topic: "strength" },
  { name: "Renaissance Periodization", handle: "@RenaissancePeriodization", channelId: "", weight: 0.9, topic: "strength" },
  { name: "Bret Contreras", handle: "@BretContrerasPhD", channelId: "", weight: 0.95, topic: "strength" },
  { name: "Alan Thrall", handle: "@UntamedStrength", channelId: "", weight: 0.85, topic: "strength" },
];

export function channelWeight(channelId: string): number {
  const hit = CHANNEL_ALLOWLIST.find((c) => c.channelId && c.channelId === channelId);
  return hit?.weight ?? 0;
}
