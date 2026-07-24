# Attributions & Licenses

Tracked per the expansion spec (Part D.1 / F Definition of Done). Keep this current
and surface it in the app's About screen.

## Video content (YouTube)

Demo videos are **embedded via the YouTube IFrame Player API** and are **not**
downloaded, scraped, or proxied. Each embed credits the source channel and links to
the original video, per the YouTube Terms of Service. Content remains the property of
its respective creators/channels. Channel allowlist (leads pending API-verified ids)
is in `src/lib/providers/video/channels.ts`.

Requires a YouTube Data API v3 key (`YOUTUBE_API_KEY`, server-side only).

## 3D anatomical model (Part D — NOT YET SOURCED)

The 3D Fatigue Map (F7/F8) requires a licensed anatomical mesh with one named object
per muscle group. **No model has been sourced or committed yet.** Candidate routes,
each with its license obligation, to be recorded here once chosen:

- **BodyParts3D / Anatomography** — CC-BY-SA (attribution + share-alike required).
- **Z-Anatomy** — open, Blender-native, pre-segmented by muscle.
- **MakeHuman base mesh** — muscle groups authored as separate objects in Blender.

Do not commit any mesh pulled from a marketplace/Sketchfab without reading its license.
If nothing suitable is free, price a commission rather than ship something unlicensed.

## Fatigue model

`recoveryTauHours`, `capacityWeight`, and all engine constants are **designed
heuristics**, not measured physiology — see `src/lib/core/fatigue/constants.ts` and
`src/lib/core/strength/muscles.ts`. The app labels the map "estimated training load."
