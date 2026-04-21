# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Kloopik (`www.kloopik.com`) is a curated browser-games portal built as a fully static Astro 5 site, hosted on Cloudflare Pages. Game listings and blog posts live as markdown content collections; everything renders at build time.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Astro dev server at http://localhost:4321 (drafts visible) |
| `npm run build` | Production build — runs `build:og` prebuild, then writes `dist/` (drafts filtered out) |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run check` | `astro check` — runs TypeScript + content-collection schema validation |
| `npm run test` | Vitest single run (jsdom env, `tests/**/*.test.ts`) |
| `npm run test:watch` | Vitest watch mode |
| `npx vitest run tests/unit/sort.test.ts` | Run a single test file |
| `npx vitest run -t "applies pins first"` | Run tests whose name matches a string |
| `npm run build:og` | Regenerate 1200×630 OG PNGs under `public/og/{games,blog}/` (runs automatically before build) |
| `npm run ingest:gamemonetize -- --limit 20 [--category puzzle] [--dry-run]` | Fetch GameMonetize feed, normalize, write draft markdown + download thumbnails |
| `npm run new:post -- --title "..." [--related slug1,slug2]` | Scaffold a draft blog post under `src/content/blog/` |
| `npm run check:links` | Verify blog `relatedGames` slugs resolve to published games and thumbnail paths exist under `public/` |

Path alias: `~/*` → `src/*` (configured in `tsconfig.json`). TypeScript extends `astro/tsconfigs/strict`.

## Environment

Local dev uses `.env.local` (copy from `.env.example`). Production values live in the Cloudflare Pages project dashboard. Required vars: `PUBLIC_GTM_ID`, `PUBLIC_GA4_ID`, `PUBLIC_CF_ANALYTICS_TOKEN`, `PUBLIC_SITE_URL`.

`BaseLayout.astro` only emits the GTM snippet when `PUBLIC_GTM_ID` starts with `GTM-`, and only emits the Cloudflare Analytics beacon when `PUBLIC_CF_ANALYTICS_TOKEN` matches a 32-char hex token. CI injects dummy values (`GTM-TEST`, `test-token`, …) so prod builds on CI work without real credentials.

## Architecture

### Content collections (`src/content/config.ts`)

Two Astro content collections back the entire site:

- **`games`** — markdown in `src/content/games/`. Schema validates `provider`, `providerId`, `embedUrl`, `thumbnail`, `categories` (must be IDs from `src/data/categories.ts`), `controls`, `orientation`, `addedAt`, `featured`, `rank`, `draft`.
- **`blog`** — markdown/MDX in `src/content/blog/`. Schema includes `relatedGames: string[]` referencing game slugs.

`src/lib/games.ts` is the only approved way to read collections. In production (`import.meta.env.PROD`) it filters out `draft: true` entries; in dev they are visible. `assertSlugsResolve()` throws at build time if a referenced slug doesn't resolve — this guarantees broken internal links fail the build, not production.

### Category registry (`src/data/categories.ts`)

The `CATEGORIES` array is the single source of truth for category IDs. The `games` collection schema imports `CATEGORY_IDS` and uses them as a Zod enum, so adding a category requires updating this file **before** any content can reference it. The provider category mapper in `src/lib/providers/gamemonetize.ts` also hard-codes these IDs.

### Sort + pin system (`src/lib/sort.ts` + `src/data/featured.ts`)

Games are ordered by `sortGames(games, { surface, pins, category? })` where `surface` is `home-hero | home-featured | all | category`. Rules, applied in order:

1. **Pinned slugs first** — from `PINS.home.hero`, `PINS.home.featured`, or `PINS.categoryPins[id]`, in their declared order.
2. **Then entries with a numeric `rank`**, ascending.
3. **Then unranked entries**, sorted by `featured` desc, then `addedAt` desc.

Pin slugs must resolve (index page calls `assertSlugsResolve`). When adding a game, reach for pins/rank to promote it; they are intentional and built-time guarded.

### Click-to-play embeds (`src/components/GamePlayer.astro`)

Game detail pages render a poster image + "Play" button, not an iframe. The iframe is injected on click via inline script. This keeps LCP/CLS green (see `lighthouserc.cjs` thresholds) and prevents third-party cookies from loading before user interaction.

### Consent Mode v2 (`src/lib/consent.ts` + `BaseLayout.astro` + `ConsentBanner.astro`)

Analytics/ads consent defaults to **denied** via a `gtag('consent', 'default', ...)` call emitted inline in `<head>` before GTM loads. The same inline script then synchronously reads `localStorage['kloopik.consent.v1']` and calls `gtag('consent', 'update', ...)` if a prior choice exists — this avoids a consent-state flash on returning visits. `ConsentBanner.astro` handles the first-visit choice and dispatches updates at runtime.

When adding any new tracker or third-party script, gate it on consent rather than adding another default-load call.

### OG image pipeline (`scripts/build-og-images.mjs` + `src/lib/og.ts`)

`prebuild` walks `src/content/{games,blog}/**/*.md{,x}`, renders a 1200×630 PNG per entry with Satori+Resvg, and writes to `public/og/{games,blog}/`. These outputs are gitignored; CI regenerates them on every build. Drafts are skipped only when `NODE_ENV=production`. `BaseLayout.astro` picks the right OG URL via its `slug`/`collection` props (`/og/{collection}/{slug}.png`), falling back to `/og/default.png`.

### Provider ingestion (`scripts/ingest-gamemonetize.ts` + `src/lib/providers/`)

`src/lib/providers/` defines a `Provider` interface (currently only GameMonetize). The ingest script:

1. Fetches the feed, normalizes entries (slugify title, map provider category → internal category via `PROVIDER_CATEGORY_MAP`, detect controls from `instructions`).
2. Dedupes against existing files in `src/content/games/`.
3. Writes markdown with `draft: true` and downloads thumbnails into `public/thumbnails/<provider>/`.

**Ingested content is always draft.** Reviewing the editorial body, verifying the embed, and flipping `draft: false` is manual. The TODO comment in the frontmatter is the handoff marker.

### Search (`src/pages/search-index.json.ts` + `SearchBox.astro` + `search.astro`)

At build time, `/search-index.json` is emitted from `buildSearchIndex()` over published games. The header `SearchBox` and the `/search/` page both fetch this JSON lazily and run Fuse.js client-side (weighted: title 0.7, tags 0.2, categories 0.1, threshold 0.35). Keep the index small — schema lives in `src/lib/search-index.ts`.

### Favorites (`src/lib/favorites.ts` + `FavoriteButton.astro` + `favorites.astro`)

Pure client-side, `localStorage['kloopik.favorites.v1']`, capped at `FAVORITES_LIMIT=200` (oldest evicted). `/favorites/` is `noindex` and renders cards client-side from a `__KLOOPIK_CATALOG__` global seeded by Astro at build time. There is no sync/backend.

### SEO surface (`src/lib/seo.ts`, `BaseLayout.astro`, JSON-LD helpers)

- `BaseLayout` always sets canonical, OG, Twitter meta, and an optional `jsonLd` array rendered via `JsonLd.astro`.
- Game pages attach `VideoGame` + `BreadcrumbList` JSON-LD. Blog posts attach `Article` + `BreadcrumbList`.
- Category pages with fewer than 6 games render `noindex` (thin-content guard — see `src/pages/categories/[category].astro:30`).
- `src/pages/llms.txt.ts` emits `/llms.txt`; `sitemap` integration emits `/sitemap-index.xml`, excluding `/404`, `/admin`, `/draft`.

### Astro config conventions (`astro.config.mjs`)

`output: 'static'`, `trailingSlash: 'always'`, `build.format: 'directory'`. Every internal URL must end with `/` — the sitemap, canonical builders, and test expectations rely on it.

## Tests

Vitest uses jsdom so tests around `favorites`, `consent`, and `storage` can hit `localStorage` directly. Tests that touch Astro collections are avoided; instead, library functions accept plain data shapes (e.g. `SortableGame`) so they can be unit-tested without booting the Astro pipeline.

## CI (`.github/workflows/`)

- **`ci.yml`** (push + PR on main): `astro check` → `npm test` → `npm run build` with dummy env.
- **`content-check.yml`** (PRs touching `src/content/**` or `public/thumbnails/**`): `astro check` + `npm run check:links`.
- **`lighthouse.yml`** (PRs on main): waits for the Cloudflare Pages preview, then runs `lhci autorun` against home, `/games/`, `/blog/`. Asserts in `lighthouserc.cjs` (perf ≥ 0.9, a11y ≥ 0.95, SEO ≥ 0.95, LCP ≤ 2500ms, CLS ≤ 0.05).

When changing anything that affects CWV (player, fonts, images, third-party scripts), expect the Lighthouse job to be the gate — verify locally via `npm run build && npm run preview` before pushing.

## Runbooks

Operational procedures (DNS, Search Console, analytics, launch) live in `docs/runbooks/`. Design spec and historical plans are in `docs/superpowers/`.
