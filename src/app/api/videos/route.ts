import { NextRequest, NextResponse } from "next/server";
import { YouTubeVideoProvider } from "@/lib/providers/video/youtube";
import { STRENGTH_EXERCISES } from "@/lib/core";
import type { VideoRef } from "@/lib/core";

/**
 * Resolve demo videos for a drill by name. Serving order:
 *   1. Curated cache (`drill_videos.json`, written by scripts/curate-videos.ts) —
 *      validated videos, no runtime quota cost.
 *   2. Live resolve via the API (admin/curation fallback).
 *   3. `[]` when no key — the client shows written cues, never a broken player.
 * NO fabricated IDs anywhere.
 */
export async function GET(req: NextRequest) {
  const drill = new URL(req.url).searchParams.get("drill");
  if (!drill) return NextResponse.json({ videos: [], configured: false });

  // 1) Curated cache (present only after running the curation job).
  const cached = await fromCache(drill);
  if (cached) return NextResponse.json({ videos: cached, configured: true, source: "cache" });

  // 2) Live resolve (needs a key).
  const provider = new YouTubeVideoProvider();
  if (!provider.isConfigured()) return NextResponse.json({ videos: [], configured: false });
  try {
    const videos = await provider.resolve({ drillName: drill });
    return NextResponse.json({ videos, configured: true, source: "live" });
  } catch {
    return NextResponse.json({ videos: [], configured: true, error: "resolve_failed" });
  }
}

async function fromCache(drillName: string): Promise<VideoRef[] | null> {
  const ex = STRENGTH_EXERCISES.find(
    (e) => e.name.toLowerCase() === drillName.toLowerCase() || e.aliases.some((a) => a.toLowerCase() === drillName.toLowerCase()),
  );
  if (!ex) return null;
  try {
    // Dynamic import so a missing cache file (before first curation) is harmless.
    const cache = (await import("@/lib/providers/video/drill_videos.json")).default as Record<string, VideoRef[]>;
    const refs = cache[ex.id];
    return refs && refs.length > 0 ? refs : null;
  } catch {
    return null;
  }
}
