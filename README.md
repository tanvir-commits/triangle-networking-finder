# Triangle Networking Finder

A mobile-first static web app that helps you find nearby Triangle places where you are likely to meet successful, affluent, educated, and well-connected professionals — plus upcoming networking and social events.

Built for use from **Durham, NC 27707**.

## Live app

**Frontend (GitHub Pages):** https://tanvir-commits.github.io/triangle-networking-finder/

The static frontend has **no API keys**. AI chat calls a separate Vercel serverless API where secrets live in platform environment variables only.

## Features

- 58 curated real places across churches, premium fitness, yoga, country clubs, professional networking, culture, upscale social venues, and nightlife
- **Upcoming Events** tab with seeded Triangle networking/social/nightlife events
- **AI chat** (floating button) — place suggestions, web search, event proposals with confirm-before-save
- Search, category filters, drive-time filter, and sorting
- Favorites shortlist, visited tracking, personal ratings and notes
- Export / import / reset for local browser data
- Light and dark mode

## Security model

| Layer | What runs | Secrets |
|-------|-----------|---------|
| GitHub Pages | Static React build (`dist/`) | **None** — safe to publish |
| Vercel `/api` | Serverless chat + events | `OPENAI_API_KEY`, optional `TAVILY_API_KEY`, optional Vercel KV |

- Never commit `.env`, `.env.local`, or real API keys
- `.gitignore` blocks env files
- Chat endpoint rate-limited (20 req/hour per IP)
- Event mutations from AI require user confirmation in the UI
- OpenAI key never appears in network responses or client code

## Cost estimate

Casual personal use typically **$5–20/month**:

- OpenAI `gpt-4o-mini`: ~$0.01–0.05 per chat turn
- Tavily search (optional): free tier covers light use
- Vercel hobby tier: free for low traffic
- Vercel KV: free tier for small event lists

AI only runs when you send a chat message — no background jobs.

## Local development

```bash
npm install
npm run dev
```

### AI + API (local)

1. Copy `.env.example` to `.env.local` and add your `OPENAI_API_KEY`
2. Optionally add `TAVILY_API_KEY` for web search
3. Run both servers:

```bash
npm run dev:all
```

4. Open the app — chat uses the local API proxy automatically in dev
5. Use the **Events** tab and floating **AI** button

## Deploy frontend (GitHub Pages)

```bash
npm run deploy
```

## Deploy API (Vercel) — required for production AI

### 1. Connect repo to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import `tanvir-commits/triangle-networking-finder`
3. Framework: Vite (or Other) — Vercel auto-detects `/api` serverless functions
4. Deploy

### 2. Set environment variables

In Vercel → Project → **Settings → Environment Variables**:

| Variable | Required | Notes |
|----------|----------|-------|
| `OPENAI_API_KEY` | Yes | From [platform.openai.com](https://platform.openai.com) |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `TAVILY_API_KEY` | No | Enables web search for events |
| `KV_REST_API_URL` | No | From Vercel KV store |
| `KV_REST_API_TOKEN` | No | From Vercel KV store |

### 3. Optional: Vercel KV for shared events

1. Vercel dashboard → **Storage → Create KV Database**
2. Connect to this project — Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`
3. Without KV, events fall back to seeded JSON; user-confirmed AI events save to browser localStorage

### 4. Configure the live app

1. Copy your Vercel deployment URL, e.g. `https://triangle-networking-finder-abc123.vercel.app`
2. Open the live GitHub Pages app → **⚙ Settings**
3. Set API base URL to `https://your-deployment.vercel.app/api`
   **Browser check:** open `https://your-deployment.vercel.app/api/events` (JSON) or `/api` (discovery JSON). Settings uses the base URL; the app appends `/events` and `/chat`.`r
4. Save — chat and server events will work

Or set `VITE_API_BASE_URL` at build time and redeploy GitHub Pages.

### CLI deploy (optional)

```bash
npx vercel --prod
```

## Using AI chat

- Tap the floating **AI** button
- Ask about places, date nights, networking, or upcoming events
- Place recommendations link to your filtered catalog
- When AI proposes adding/removing an event, a **Confirm** card appears — nothing saves until you approve
- Confirmed events save locally; if Vercel KV is configured, they also sync server-side

## Events storage

| Mode | Behavior |
|------|----------|
| **Seed JSON** | `public/events.json` + `api/data/events-seed.json` — static fallback |
| **Vercel KV** | Server-side read/write when KV env vars are set |
| **localStorage** | User-confirmed AI events and removals on this device |

## Data notes

- Drive times are approximate from Durham 27707
- Event dates in the seed list are **examples** — verify on organizer sites
- Every place uses a real organization website and Google Maps search link
