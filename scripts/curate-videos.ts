/**
 * Video curation job (spec C.2/C.3). The honest "video finder": it resolves the
 * allowlist handles to real channel IDs, then for every drill discovers and
 * VALIDATES embeddable public videos via the YouTube Data API, and writes a
 * cache the app serves from. No hardcoded/fabricated IDs — everything is verified
 * against the live API.
 *
 * Run:  YOUTUBE_API_KEY=... npx tsx scripts/curate-videos.ts
 * Quota: channels.list = 1u, search.list = 100u, videos.list = 1u. With ~30
 * drills that's ~3,100 units — under the 10,000/day budget. Run occasionally.
 */

import { writeFileSync } from "node:fs";
import { STRENGTH_EXERCISES } from "../src/lib/core/strength/library";
import { CHANNEL_ALLOWLIST } from "../src/lib/providers/video/channels";

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) {
  console.error("Set YOUTUBE_API_KEY to run curation. Get one at console.cloud.google.com → enable 'YouTube Data API v3'.");
  process.exit(1);
}

const API = "https://www.googleapis.com/youtube/v3";
const OUT = "src/lib/providers/video/drill_videos.json";

async function j<T>(url: string): Promise<T> {
  const res = await fetch(`${API}${url}&key=${KEY}`);
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/** Resolve any allowlist handles that don't yet have a verified channel id. */
async function resolveChannels(): Promise<Record<string, number>> {
  const weights: Record<string, number> = {};
  for (const c of CHANNEL_ALLOWLIST) {
    let id = c.channelId;
    if (!id) {
      try {
        const data = await j<{ items?: { id: string }[] }>(`/channels?part=id&forHandle=${encodeURIComponent(c.handle)}`);
        id = data.items?.[0]?.id ?? "";
        if (id) console.log(`resolved ${c.handle} → ${id}`);
      } catch (e) {
        console.warn(`could not resolve ${c.handle}: ${(e as Error).message}`);
      }
    }
    if (id) weights[id] = c.weight;
  }
  return weights;
}

interface VideoStatus { embeddable: boolean; privacyStatus: string; durationSeconds: number }
function iso(d: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}
async function validate(id: string): Promise<VideoStatus> {
  const data = await j<{ items?: { status?: { embeddable?: boolean; privacyStatus?: string }; contentDetails?: { duration?: string } }[] }>(`/videos?part=status,contentDetails&id=${id}`);
  const it = data.items?.[0];
  return { embeddable: it?.status?.embeddable ?? false, privacyStatus: it?.status?.privacyStatus ?? "unknown", durationSeconds: iso(it?.contentDetails?.duration ?? "") };
}

async function main() {
  const channelWeights = await resolveChannels();
  const catalog: Record<string, unknown[]> = {};

  for (const ex of STRENGTH_EXERCISES) {
    const q = encodeURIComponent(ex.name);
    const search = await j<{ items?: { id: { videoId: string }; snippet: { title: string; channelId: string; channelTitle: string } }[] }>(
      `/search?part=snippet&type=video&maxResults=6&videoEmbeddable=true&q=${q}`,
    );
    const refs: unknown[] = [];
    for (const item of search.items ?? []) {
      const st = await validate(item.id.videoId);
      if (!st.embeddable || st.privacyStatus !== "public" || st.durationSeconds < 45 || st.durationSeconds > 360) continue;
      const titleMatch = item.snippet.title.toLowerCase().includes(ex.name.toLowerCase()) ? 1 : 0;
      const score = (channelWeights[item.snippet.channelId] ?? 0) * 2 + titleMatch;
      refs.push({ provider: "youtube", videoId: item.id.videoId, title: item.snippet.title, channelId: item.snippet.channelId, channelTitle: item.snippet.channelTitle, embeddable: true, durationSeconds: st.durationSeconds, lastValidatedAt: new Date().toISOString(), curatedBy: "auto", _score: score });
    }
    refs.sort((a, b) => (b as { _score: number })._score - (a as { _score: number })._score);
    catalog[ex.id] = refs.slice(0, 3);
    console.log(`${ex.id}: ${catalog[ex.id]!.length} validated video(s)`);
  }

  writeFileSync(OUT, JSON.stringify(catalog, null, 2));
  console.log(`\nWrote ${OUT}. The app now serves these curated, validated videos.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
