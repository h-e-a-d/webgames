# Kloopik

Curated browser games portal — `www.kloopik.com`.

## Development

```bash
cp .env.example .env.local   # fill in real values
npm install
npm run dev                   # localhost:4321
npm run build                 # dist/
npm run test                  # vitest unit tests
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Astro dev server at http://localhost:4321 |
| `npm run build` | Production build (runs `build:og` first, writes to `dist/`) |
| `npm run test` | Vitest run |
| `npm run test:watch` | Vitest watch mode |
| `npm run build:og` | Regenerate OG images under `public/og/` |
| `npm run ingest:gamemonetize -- --limit 20` | Fetch and draft markdown for 20 games from GameMonetize |
| `npm run new:post -- --title "..."` | Scaffold a draft blog post |
| `npm run check:links` | Validate internal links (blog relatedGames, thumbnails) |

## Environment variables

Local: `.env.local` (gitignored). Production: Cloudflare Pages project dashboard.

| Key | Used by |
|---|---|
| `PUBLIC_GTM_ID` | GTM container snippet in `BaseLayout` |
| `PUBLIC_GA4_ID` | GA4 config tag inside GTM |
| `PUBLIC_CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics beacon |
| `PUBLIC_SITE_URL` | Canonical URL + sitemap |

## Runbooks

- `docs/runbooks/dns-and-domain.md`
- `docs/runbooks/gsc-and-analytics.md`
- `docs/runbooks/launch-checklist.md`

## Stack

- Astro 5 (static output)
- Cloudflare Pages (hosting + CDN)
- Cloudflare Web Analytics (cookieless)
- Google Tag Manager → GA4 (consent-gated)
- Vitest (unit tests)

See `docs/superpowers/specs/2026-04-21-kloopik-games-portal-design.md` for the full design, and `docs/superpowers/plans/` for implementation plans.
