"use client";

import { useEffect, useState } from "react";
import type { VideoRef } from "@/lib/core";

/**
 * In-session video demo (spec C.2/C.3). Attempts to resolve a validated,
 * embeddable YouTube demo for the drill; on no-key / offline / none-found it
 * degrades to the written state — never a broken player. Always credits the
 * channel and links to the source (YouTube ToS + the decent thing to do).
 */
export function VideoDemo({ drillName }: { drillName: string }) {
  const [video, setVideo] = useState<VideoRef | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setVideo(null);
    fetch(`/api/videos?drill=${encodeURIComponent(drillName)}`)
      .then((r) => r.json())
      .then((j: { videos: VideoRef[] }) => {
        if (cancelled) return;
        const v = j.videos?.[0] ?? null;
        setVideo(v);
        setState(v ? "ready" : "none");
      })
      .catch(() => !cancelled && setState("none"));
    return () => { cancelled = true; };
  }, [drillName]);

  if (state === "ready" && video) {
    const start = video.startSeconds ? `?start=${video.startSeconds}` : "";
    return (
      <div>
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}${start}`}
            title={video.title}
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noreferrer" className="mt-1.5 block text-[11px] text-white/40 hover:text-white/70">
          {video.title} — {video.channelTitle} ↗
        </a>
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-white/[0.06] bg-court-900/70 text-center text-xs text-white/30">
      {state === "loading" ? "Looking for a demo…" : "No demo loaded — follow the cues below. (Videos need a YouTube key.)"}
    </div>
  );
}
