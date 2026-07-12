# 🦉 Rodney — Your Research Buddy
![Uploading Screenshot 2026-07-11 at 4.23.38 PM.png…]()

**Don't just ask AI. Read the real research.**

Rodney is a friendly owl who sits beside you while you read actual scientific
papers — and explains the dense parts in plain language whenever you ask.
Instead of outsourcing your understanding to a chatbot summary, you read the
primary source and build the skill; Rodney brings the patience.

## What it does

- **A calm reading room** — real papers (fetched from arXiv) rendered as clean,
  long-form reading, not PDFs squinted at in a viewer.
- **Highlight → Ask Rodney** — select any dense passage (even a formula) and
  Rodney streams a warm, plain-language explanation with the paper's context.
- **Explain it simpler** — one tap re-explains for a curious 12-year-old.
- **What's this paper about?** — a friendly overview of any paper.
- **Curious? Ask Rodney** — AI-generated question chips specific to each
  paper's actual content (with static fallbacks so the demo never breaks).
- **Follow-up chat** — ask Rodney anything about the passage.
- **Personalized explanations** — a two-question, skippable onboarding
  (stored in localStorage, no accounts) tunes Rodney's depth and framing.
- **My Papers** — a reading-history dashboard saved in your browser, with
  one-click "Read again". A lightweight stand-in for a real accounts +
  database setup — the natural post-hackathon next step.
- **Bring your own paper** — paste any arXiv link and read it with Rodney.

## Stack

- Node.js + Express 5 (one process serves the app and the API)
- React 19 + Vite 7 + Tailwind CSS 4, GSAP for Rodney's animations
- **DigitalOcean** — an optional DO Agent endpoint as Rodney's primary brain,
  with the DO Inference Engine (Claude Sonnet → Haiku ladder) as automatic
  fallback, via the OpenAI SDK, streamed token-by-token over SSE.
  All keys stay server-side.
- arXiv HTML (LaTeXML) parsing with cheerio, with an ar5iv → abstract-only
  fallback ladder

## Run it locally

```bash
npm install
cp .env.example .env   # paste your DigitalOcean key(s)
npm run build
npm start              # → http://localhost:3000
```

For development with hot reload: `npm run dev` (→ http://localhost:5173).

Add another preloaded paper: `npm run fetch-paper -- <arxiv id or url>`, then
add an entry to `server/papers/index.json`.

## Deploy (DigitalOcean App Platform)

1. Push this repo to GitHub.
2. cloud.digitalocean.com → **Apps** → **Create App** → GitHub → pick this repo
   (branch `main`). The included `.do/app.yaml` pre-fills the configuration.
3. Paste your model access key when prompted for `DIGITAL_OCEAN_MODEL_ACCESS_KEY`
   (and optionally `AGENT_ENDPOINT` / `AGENT_API_KEY` for an agent-first setup).
4. Create — every push to `main` auto-deploys.
