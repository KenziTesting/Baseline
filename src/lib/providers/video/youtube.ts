/**
 * YouTube Data API v3 provider (spec C.2). SERVER-ONLY.
 *
 * Quota reality: `search.list` costs 100 units of a 10,000/day budget, so
 * discovery is an admin/build-time job and results must be cached aggressively —
 * NOT a per-request runtime call in production. This implementation performs the
 * real calls for the admin/curation path; the in-app route serves cached/curated
 * refs and falls back to written cues when nothing is available.
 *
 * Playback is via the IFrame Player API on the client; we never scrape or proxy
 * the stream (YouTube ToS), and we always credit the channel + link to source.
 */

import type { VideoRef } from "@/lib/core";
import { channelWeight } from "./channels";
import type { ResolveQuery, VideoProvider, VideoStatus } from "./types";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

function iso8601ToSeconds(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 3600) + (Number(m[2] ?? 0) * 60) + Number(m[3] ?? 0);
}

export class YouTubeVideoProvider implements VideoProvider {
  readonly id = "youtube";
  private readonly key: string | undefined;

  constructor() {
    this.key = process.env.YOUTUBE_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.key);
  }

  async validate(videoId: string): Promise<VideoStatus> {
    if (!this.key) return { exists: false, embeddable: false, privacyStatus: "unknown", durationSeconds: 0 };
    const url = `${VIDEOS_URL}?part=status,contentDetails&id=${videoId}&key=${this.key}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { exists: false, embeddable: false, privacyStatus: "unknown", durationSeconds: 0 };
    const json = (await res.json()) as { items?: { status?: { embeddable?: boolean; privacyStatus?: string }; contentDetails?: { duration?: string } }[] };
    const item = json.items?.[0];
    if (!item) return { exists: false, embeddable: false, privacyStatus: "unknown", durationSeconds: 0 };
    return {
      exists: true,
      embeddable: item.status?.embeddable ?? false,
      privacyStatus: (item.status?.privacyStatus as VideoStatus["privacyStatus"]) ?? "unknown",
      durationSeconds: iso8601ToSeconds(item.contentDetails?.duration ?? ""),
    };
  }

  async resolve(query: ResolveQuery): Promise<VideoRef[]> {
    if (!this.key) return [];
    // Discovery (100 quota units). In production this is cached in `drill_videos`.
    const q = encodeURIComponent(query.drillName);
    const url = `${SEARCH_URL}?part=snippet&type=video&maxResults=8&q=${q}&videoEmbeddable=true&key=${this.key}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      items?: { id: { videoId: string }; snippet: { title: string; channelId: string; channelTitle: string } }[];
    };
    const candidates = json.items ?? [];

    const scored: { ref: VideoRef; score: number }[] = [];
    for (const c of candidates) {
      const status = await this.validate(c.id.videoId);
      if (!status.exists || !status.embeddable || status.privacyStatus !== "public") continue;
      if (status.durationSeconds < 45 || status.durationSeconds > 360) continue; // 45s–6min
      const titleMatch = c.snippet.title.toLowerCase().includes(query.drillName.toLowerCase()) ? 1 : 0;
      const score = channelWeight(c.snippet.channelId) * 2 + titleMatch + 0.001;
      scored.push({
        ref: {
          provider: "youtube",
          videoId: c.id.videoId,
          title: c.snippet.title,
          channelId: c.snippet.channelId,
          channelTitle: c.snippet.channelTitle,
          embeddable: true,
          durationSeconds: status.durationSeconds,
          lastValidatedAt: new Date().toISOString(),
          curatedBy: "auto",
          role: query.role ?? "demo",
        },
        score,
      });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, 3).map((s) => s.ref);
  }
}
