/**
 * Video provider interface (spec Part C.2). SERVER-side resolution; the API key
 * never reaches the client. NO hardcoded/fabricated video IDs anywhere — every
 * ref is resolved and validated against the live YouTube Data API.
 */

import type { VideoRef } from "@/lib/core";

export interface ResolveQuery {
  drillName: string;
  aliases?: string[];
  role?: "demo" | "coaching" | "fault_fix";
}

export interface VideoStatus {
  exists: boolean;
  embeddable: boolean;
  privacyStatus: "public" | "unlisted" | "private" | "unknown";
  durationSeconds: number;
}

export interface VideoProvider {
  readonly id: string;
  isConfigured(): boolean;
  /** Returns up to 3 curated/validated refs, or [] when unavailable. */
  resolve(query: ResolveQuery): Promise<VideoRef[]>;
  validate(videoId: string): Promise<VideoStatus>;
}
