# Deploying Baseline to your phone

Baseline is a **web app / PWA**, not an App Store app. You put it on your phone by
deploying it to the web once, then adding it to your home screen. Vercel (the company
behind Next.js) is the easiest host and has a free tier that's plenty for personal use.

---

## 1. Push the code to GitHub

The repo is already initialized and committed locally (branch `main`). You just need to
create an empty GitHub repo and push to it.

```bash
cd /Users/ken/baseline

# Create the repo and push in one step (needs the GitHub CLI, `brew install gh`):
gh repo create baseline --private --source=. --remote=origin --push

# --- OR, without gh: create an empty repo at github.com/new (do NOT add a README),
# then: ---
git remote add origin https://github.com/<your-username>/baseline.git
git push -u origin main
```

> `.env.local` (your API keys) is gitignored and was verified **not** committed. Keep it that way —
> secrets go in Vercel's dashboard, never in the repo.

## 2. Import into Vercel

1. Go to **vercel.com** → sign in with GitHub.
2. **Add New… → Project** → pick the `baseline` repo → **Import**.
3. Framework preset auto-detects **Next.js**. Leave build settings default
   (build `next build`, output handled automatically).
4. Don't deploy yet — add env vars first (next step), or deploy and add them after
   (then hit **Redeploy**).

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

Add only what you use. **The app deploys and runs with none of these** — features degrade
honestly (see the fallbacks column).

| Variable | Enables | If missing |
|----------|---------|------------|
| `ANTHROPIC_API_KEY` | Live AI Coach | Coach reads your data back (offline mode) |
| `YOUTUBE_API_KEY` | Re-curating drill demo videos | Already-curated videos in `drill_videos.json` still play; no re-curation |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cross-device sync + auth | Runs local-only (localStorage) |
| `SUPABASE_SERVICE_ROLE_KEY` | Seeding reference data (server-only) | Skip the seed script |
| `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` / `WHOOP_REDIRECT_URI` | Real WHOOP recovery | Use Demo or Self-report readiness |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google Calendar (future phase) | — |

Copy the values from your local `.env.local`. **Two things to change for production:**

- `WHOOP_REDIRECT_URI` → `https://<your-app>.vercel.app/api/whoop/callback`
  (and add that exact URL to your WHOOP app's allowed redirect URIs).
- `GOOGLE_REDIRECT_URI` → same pattern, if/when you wire Calendar.

> ⚠️ **Rotate the two keys you pasted in chat** (YouTube + Anthropic) before putting them in
> Vercel — a secret shared in plaintext should be considered burned. Regenerate them in the
> Google Cloud Console and console.anthropic.com, then paste the fresh ones into Vercel.
>
> ⚠️ **The live Coach needs Anthropic credits.** The current key returns "credit balance too low."
> Add credits at **console.anthropic.com → Plans & Billing** to activate it.

## 4. Deploy

Click **Deploy**. In ~1–2 minutes you get a public URL like `https://baseline-xxx.vercel.app`.
Every future `git push` to `main` auto-deploys.

## 5. Install it on your phone

1. Open the Vercel URL in **Safari (iPhone)** or **Chrome (Android)**.
2. **iPhone:** Share button → **Add to Home Screen**.
   **Android:** ⋮ menu → **Install app** / **Add to Home Screen**.
3. You now have a Baseline icon that launches full-screen (no browser chrome), with the
   basketball app icon, and the app shell works offline (service worker is active in
   production only).

---

## Local development recap

```bash
npm install
cp .env.example .env.local   # fill in what you want
npm run dev                  # http://localhost:3000
npm run build && npm start   # production build (test the service worker here — it's prod-only)
```

To regenerate the app icons after a design change: `node scripts/gen-icons.mjs`.
To re-curate demo videos (needs `YOUTUBE_API_KEY`): `npx tsx scripts/curate-videos.ts`.
