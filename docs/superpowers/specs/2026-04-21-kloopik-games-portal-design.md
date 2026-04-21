# Kloopik — Games Portal Redesign

**Date:** 2026-04-21
**Status:** Draft — pending user review
**Domain:** `kloopik.com` (canonical: `www.kloopik.com`)
**Repository:** existing `kloopik` GitHub repo, in-place rebuild

## Goal

Rebuild `kloopik.com` from scratch as a **curated web game portal** that aggregates third-party browser games (GameMonetize and, later, other providers) and grows via **organic search and AI-search citation**. The MVP must run entirely on free tiers.

The previous Eleventy/Clerk/D1/SpaceX-design build is scrapped completely. Nothing from it carries forward mechanically; only the `CNAME`, Cloudflare Pages project, and DNS wiring are preserved.

## Non-goals

- No user accounts, auth, server-side persistence, or backend database at MVP.
- No multilingual content at launch (English-only).
- No display ad network beyond what GameMonetize's embeds include natively.
- No hub/collection landing pages as a dedicated content type — blog posts play that role.
- No headless CMS at launch — markdown in Git is the authoring surface.
- No Next.js or React-first framework — overkill for a static content site.

## Decisions summary

| Area | Decision |
|---|---|
| Catalog scale | Lean curation, 50–300 games |
| SEO content model | Per-game editorial reviews + standalone blog |
| Auth | None at MVP. Favorites / history via `localStorage` only |
| Monetization | GameMonetize's built-in in-game ads only. No AdSense, no affiliates |
| Localization | English-only. URL structure not locale-prefixed |
| Providers | Normalized schema from day one. GameMonetize adapter at launch |
| Visual design | Conventional games-portal pattern (dense thumbnail grid, categories, search) |
| Authoring | Markdown in Git. Decap CMS deferred |
| Infra approach | In-place nuke of existing repo. Same domain, same CF Pages project |
| SSG | **Astro** (Content Collections, islands, TS, CF Pages adapter) |
| Analytics | **CF Web Analytics** (cookieless baseline) **+ GTM → GA4** (full behavioral data) |
| Consent banner | Hand-rolled ~50 LOC, Google Consent Mode v2 (advanced) |

## Architecture

### Deployment topology

```
GitHub (main branch)
  └─► Cloudflare Pages (build + static hosting, free tier)
        └─► www.kloopik.com  (canonical)
        └─► kloopik.com  → 301 redirect to www
```

- No SSR, no DB, no serverless functions at runtime.
- Build time: <90s at 300 games.
- Deploys: push to `main`. PR branches get automatic preview URLs (these *are* the staging environment).

### Content sources

```
src/content/games/*.md  ─┐
src/content/blog/*.md    ├─►  Astro build  ─►  Static HTML + optimized images
src/data/featured.ts     │          │
src/data/categories.ts   ─┘         └─►  /sitemap-*.xml, /feed.xml, /llms.txt
```

Games are authored as markdown files, one per game. Blog posts likewise. A typed Zod schema validates all frontmatter at build time; schema violations fail the build.

### Analytics & consent

Two parallel analytics systems:

1. **Cloudflare Web Analytics** — cookieless, runs on every page load regardless of consent state. Provides ground-truth traffic numbers. No consent required.
2. **Google Tag Manager container → GA4** — cookie-based, gated by consent. Default consent state is `denied` for `analytics_storage` and `ad_storage` (Google Consent Mode v2 advanced). Banner acceptance flips to `granted` and GA4 begins reporting.

The consent banner also gates whether the GameMonetize game iframe loads on game detail pages.

Rationale for both: GA4 is the SEO operator's toolkit (GSC linking, event funnels, audiences). CF Web Analytics catches the 30–60% of traffic lost to consent rejection and ad blockers, so real audience size is never a mystery.

### Teardown (part of the nuke commit)

- Delete Clerk organization via Clerk dashboard
- `wrangler d1 delete kloopik-db`
- Remove `functions/_middleware.js`, `functions/api/`, `migrations/`
- Remove `[[d1_databases]]` and Clerk vars from `wrangler.toml` (or delete the file outright)
- Remove old Playwright tests and old inline Google Ads script from the base template
- `git rm -rf` everything except `.git`, `.gitignore`, and `CNAME`

## Repository structure

```
kloopik/
├── CNAME                              # preserved
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
├── public/
│   ├── favicon.svg
│   ├── manifest.json
│   ├── robots.txt
│   ├── thumbnails/<provider>/<id>.webp
│   └── og/                            # static OG fallbacks
├── src/
│   ├── content/
│   │   ├── config.ts                  # Zod schemas
│   │   ├── games/*.md
│   │   └── blog/*.md
│   ├── data/
│   │   ├── categories.ts              # canonical category list
│   │   └── featured.ts                # per-surface pinned slug arrays
│   ├── lib/
│   │   ├── providers/
│   │   │   ├── types.ts               # NormalizedGame, Provider
│   │   │   ├── gamemonetize.ts
│   │   │   └── index.ts               # registry
│   │   ├── seo.ts                     # meta, OG, JSON-LD helpers
│   │   ├── sort.ts                    # sortedGames() resolver
│   │   ├── consent.ts                 # client consent banner logic
│   │   └── storage.ts                 # localStorage wrapper
│   ├── components/
│   │   ├── GameCard.astro
│   │   ├── GameGrid.astro
│   │   ├── CategoryFilter.astro
│   │   ├── SearchBox.astro            # client island
│   │   ├── FavoriteButton.astro       # client island
│   │   ├── ConsentBanner.astro        # client island
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── GameLayout.astro
│   │   └── BlogLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── games/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── categories/[category].astro
│   │   ├── blog/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── about.astro
│   │   ├── privacy.astro
│   │   ├── terms.astro
│   │   ├── 404.astro
│   │   ├── rss.xml.ts
│   │   ├── sitemap-index.xml.ts
│   │   └── llms.txt.ts
│   └── styles/global.css
└── scripts/
    └── ingest-gamemonetize.ts
```

## Content model

### Game schema (Zod, `src/content/config.ts`)

```ts
{
  slug:         string,          // URL-safe, unique
  title:        string,
  provider:     'gamemonetize' | <extensible>,
  providerId:   string,
  embedUrl:     url,
  thumbnail:    { src: string, width: number, height: number },
  categories:   string[],        // each must appear in categories.ts
  tags:         string[],
  controls:     ('mouse'|'keyboard'|'touch')[],
  orientation:  'landscape' | 'portrait' | 'both',
  addedAt:      date,
  featured:     boolean,
  rank:         number | undefined,   // optional global ordering
  draft:        boolean,
  // body (markdown): editorial review, 200-400 words
}
```

Build fails on unknown category, duplicate slug, or missing required field.

### Blog schema

```ts
{
  title:        string,
  description:  string,
  publishedAt:  date,
  updatedAt:    date | undefined,
  tags:         string[],
  hero:         image | undefined,
  relatedGames: string[],        // slugs; must resolve to existing games
  draft:        boolean,
  // body (markdown): the post
}
```

### Categories

A canonical list in `src/data/categories.ts`. Games reference categories by id. Adding a new category requires editing this file — stops one-off typos from spawning ghost categories.

## Sorting model

Three-layer resolver. A single helper, `sortedGames(surface, opts?)`, composes them in order:

**Layer 1 — Per-surface pinned lists** (`src/data/featured.ts`)

```ts
export const homeHero: string[]       // exact order on home hero row
export const homeFeatured: string[]   // exact order on home featured grid
export const categoryPins: Record<string, string[]>   // per-category top entries
```

Slugs listed here appear in the exact order given and are removed from the fallback pool (no duplication).

**Layer 2 — Frontmatter `rank`** (per-game)

Optional integer in a game's markdown frontmatter. Lower = earlier. Applies globally (all-games, search results). Games without `rank` sort after all ranked games.

**Layer 3 — Default sort** (fallback)

- Listings: `featured: true` first, then `addedAt` descending.
- Category pages: same, scoped.
- Blog: `publishedAt` descending.

All resolution is build-time. No runtime cost.

## Routes

| Route | Purpose | Indexed? |
|---|---|---|
| `/` | Home: hero + featured grid + recent | yes |
| `/games/` | All games (paginated, filterable) | yes (first page only) |
| `/games/[slug]/` | Game detail + editorial review | yes |
| `/categories/[category]/` | Games in a category | yes if ≥6 games + intro present, else `noindex` |
| `/blog/` | Blog index | yes |
| `/blog/[slug]/` | Blog post | yes |
| `/about/` | About page | yes |
| `/privacy/` | Privacy policy | yes |
| `/terms/` | Terms | yes |
| `/404` | Not found | no |
| `/robots.txt` | — | — |
| `/sitemap-index.xml` | Sitemap index | — |
| `/feed.xml` | RSS for blog | — |
| `/llms.txt` | AI-search hint file | — |

URL conventions:
- Trailing slash enforced (redirect from non-slashed variant).
- `kloopik.com` → `www.kloopik.com` 301 at Cloudflare.
- Slug-only URLs (no numeric IDs).

## SEO strategy

### Per-game page

- **Title:** `{title} — Play Free Online | Kloopik` (<60 chars)
- **Meta description:** first 150 chars of the editorial review
- **Canonical:** absolute URL with trailing slash
- **OG + Twitter:** title, description, thumbnail (1200×630 generated at build)
- **JSON-LD: `VideoGame`** with `name`, `genre`, `gamePlatform: Web`, `operatingSystem: Web`, `author`, `inLanguage: en`, `image`, `description`, `url`
- **Breadcrumb JSON-LD:** Home → Category → Game

### Per-blog-post page

- **Article JSON-LD** with `author`, `datePublished`, `dateModified`, `image`, `headline`, `description`
- **Semantic HTML:** one `<h1>`, proper heading nesting, `<article>`, `<time>`
- **"Games mentioned" block** rendered from `relatedGames` frontmatter — internal linking and crawl equity from content pages to game pages

### Site-wide

- `sitemap-index.xml` split into `sitemap-games.xml`, `sitemap-blog.xml`, `sitemap-static.xml` (via `@astrojs/sitemap`)
- `robots.txt` allowlists, references sitemap index
- `llms.txt` includes site description, top content links, machine-readable inventory
- `/feed.xml` (RSS) for blog only
- Internal linking rules: every game page links to ≥3 others in the same category; every blog post links to ≥2 games

### AI-search-specific

- **Passage-level citability:** every review opens with a 1–2 sentence factual summary. Editorial template enforces this.
- **Entity agreement:** visible text matches JSON-LD entity data.
- **Freshness signals:** `dateModified` updated on markdown changes (git-derived).
- **No cloaked content.**

### Excluded

- No pagination-heavy listing SEO (listings are UX; SEO weight lives on detail pages)
- No thin category hubs (gated by ≥6 games + intro)
- No templated "top 10" pages
- No keyword-stuffed reviews

### Measurement

- GSC + GA4 linked via GTM
- Monthly GSC query export → editorial calendar (target positions 8–20)
- Monthly AI-search spot check: 10 target keywords on ChatGPT / Perplexity / Google AI Overviews

## Performance budgets

| Surface | LCP | INP | CLS | JS (gzip) |
|---|---|---|---|---|
| Home | <1.8s | <150ms | <0.02 | <30KB |
| Category | <2.0s | <150ms | <0.05 | <30KB |
| Game detail | <2.2s | <200ms | <0.05 | <50KB |
| Blog post | <1.8s | <150ms | <0.02 | <15KB |

### Implementation

- **Astro islands.** Default pages ship zero JS. Only `SearchBox`, `FavoriteButton`, `ConsentBanner` hydrate.
- **Images.** `@astrojs/image` → AVIF + WebP with explicit dimensions. 320/640/960 responsive sizes. Lazy below the fold; `loading="eager" fetchpriority="high"` on the first 8 grid cells.
- **Fonts.** Self-hosted WOFF2, `font-display: swap`, preload display weight only. No Google Fonts.
- **CSS.** Single `global.css`; critical inlined by Astro. No Tailwind at MVP (reconsider if components explode).
- **Game iframe deferred.** Detail page shows thumbnail + "Play" button. Clicking inserts the iframe. Protects LCP and delays GameMonetize ad stack until intent.
- **GTM loaded with `defer`, after interactive.** CF Web Analytics beacon immediate (2KB).
- **Cloudflare features.** Brotli, HTTP/3, image optimization, automatic minification — all free.
- **No SPA router.** Full HTML navigations. View Transitions API is an optional later polish.

### Measurement

- **CrUX field data** via GSC (Google's actual ranking input)
- **Lighthouse CI** in GitHub Actions on every PR against the preview URL; fails red if budgets regress
- **PageSpeed Insights** for manual spot checks on new templates

## Provider adapters

```ts
interface NormalizedGame { /* matches content schema */ }

interface Provider {
  id: string;
  fetchCatalog(): Promise<NormalizedGame[]>;
}
```

- Adapters live in `src/lib/providers/<provider>.ts`.
- Registry in `src/lib/providers/index.ts`.
- GameMonetize adapter fetches their JSON feed, normalizes fields, downloads thumbnails to `public/thumbnails/gamemonetize/<id>.webp`.
- Thumbnails always self-hosted. Never hotlinked. Committed to Git (small WebP).
- Adding a provider = one new adapter file + registry entry. No data-layer rewrite.

## Content pipeline

### Adding a game

1. `npm run ingest:gamemonetize -- --limit 20` → generates `draft: true` markdown files in `src/content/games/` and thumbnails in `public/thumbnails/`.
2. Human review: decide ship or kill. Write 200–400 word editorial review. Confirm categories/tags. Set `draft: false`. Optionally set `rank` / `featured`.
3. Commit, PR, preview, merge. CF Pages builds production.

Nothing auto-publishes. The ingest script is a time-saver, not a firehose.

### Updating a game

- Edit markdown, commit. Freshness signal via `updatedAt`.
- If embed URL changes upstream: `--update-existing` flag on ingest, review diff.

### Removing a game

- Delete markdown + thumbnail. Optional 410/301 in `public/_redirects` if SEO equity matters.

### Writing a blog post

1. `npm run new:post -- --title "..."` scaffolds dated markdown in `src/content/blog/`.
2. Write. Fill `relatedGames`.
3. Commit, PR, preview, merge.

### Review template (game detail body)

1. **First sentence** — factual, citable.
2. **How it plays** — 2–3 sentences on feel and controls.
3. **What's good / what's not** — short paragraph each.
4. **If you like this** — 2–3 related on-site games.

Template guides, doesn't rigidly enforce.

## CI/CD

### Workflows (GitHub Actions, free tier)

- **`ci.yml`** — install, typecheck, lint, `astro build`. Every push/PR.
- **`lighthouse.yml`** — Lighthouse CI against preview URL on PRs to `main`. Fails on budget regression.
- **`content-check.yml`** — frontmatter schema validation, internal link check, thumbnail existence check. On PRs touching content.

### Environments

- `main` → production
- Feature branches → CF Pages preview URLs (staging replacement)
- No long-lived `staging` branch

### Environment variables (CF Pages dashboard)

- `PUBLIC_GTM_ID`
- `PUBLIC_GA4_ID`
- `PUBLIC_CF_ANALYTICS_TOKEN`
- `PUBLIC_SITE_URL` = `https://www.kloopik.com`

Local `.env.local` (gitignored) mirrors these. `.env.example` is checked in.

### Rollback

CF Pages → Deployments → promote a previous deployment (one click). Git revert also works but takes a build cycle.

## Risk & mitigations

| Risk | Mitigation |
|---|---|
| GameMonetize games go dead or low quality | Human curation in pipeline. CI link-check script flags dead `embedUrl`s. |
| Ad-block underreports GA4 | CF Web Analytics as ground-truth fallback. |
| EU consent rejection erodes GA signal | Same — CF Web Analytics is cookieless. |
| Slow SEO ramp (3–6 months to meaningful traffic) | Commit to steady publishing cadence, not a launch blitz. |
| AI-search citation is non-deterministic | Structure correctly, measure monthly, refine. |
| Clerk publishable key in git history | Teardown the Clerk org entirely. Publishable keys are safe to expose by design. |

## Free-tier ceilings

| Service | Free limit | Projected MVP | Margin |
|---|---|---|---|
| Cloudflare Pages | unlimited requests + bandwidth, 500 builds/mo | <30 builds/mo | 15× |
| Cloudflare Web Analytics | unlimited sites, 6mo retention | 1 site | ∞ |
| GitHub Actions | 2000 min/mo (private) or unlimited (public) | ~80 min/mo | 25× |
| GA4 | 10M events/mo | <100k/mo | 100× |
| GameMonetize | free publisher account | revshare to publisher | ∞ |

No paid tier required for MVP.

## Launch checklist

**Phase 0 — Teardown**
1. `git rm -rf` old source. Keep `.git`, `.gitignore`, `CNAME`. Commit "nuke old site".
2. Delete Clerk org, D1 database, unused Pages Functions.

**Phase 1 — Scaffold**
3. `npm create astro@latest` inside the repo. Integrations: sitemap, rss, mdx, image.
4. `src/content/config.ts` with Zod schemas.
5. Provider adapter scaffolding + `NormalizedGame` type.
6. `BaseLayout` with GTM + CF Analytics + consent banner.
7. `ConsentBanner` island (~50 LOC, Google Consent Mode v2 advanced).

**Phase 2 — Content model**
8. 5–10 hand-written game markdown files across 3 categories (exercises templates).
9. 1 blog post.
10. `GameCard`, `GameGrid`, `CategoryFilter`, `Header`, `Footer`.

**Phase 3 — Routes**
11. Home, `/games/`, `/games/[slug]/`, `/categories/[category]/`, `/blog/`, `/blog/[slug]/`, static pages, `/404`.
12. `sitemap-index.xml`, `robots.txt`, `feed.xml`, `llms.txt`.

**Phase 4 — Polish**
13. JSON-LD on game + blog pages.
14. Favorites (`localStorage` + `FavoriteButton` island).
15. Search (client-side prebuilt index via Pagefind or Fuse.js).
16. GameMonetize ingest script.

**Phase 5 — Ship**
17. DNS verify. Deploy `main`. CF Pages promotes.
18. GSC verify + sitemap submit. GA4 live. GTM tags live.
19. Bulk-ingest first 50 games; human-review and ship in batches of 10.
20. First blog post published.

**Phase 6 — After launch**
21. Cadence: 2 blog posts/month minimum, 5–10 new games/month.
22. Monthly review: GSC queries, GA4 engagement, AI-search spot checks.

## Open items for implementation phase

These are implementation decisions, not design decisions. They will be resolved during the write-plans step:

- Choice between Pagefind and Fuse.js for client-side search (both free, differ in bundle size vs features).
- Exact category list (seeded by GameMonetize's taxonomy but trimmed for editorial coherence).
- Specific Lighthouse CI thresholds in `lighthouserc.js`.
- Exact consent banner copy and privacy policy wording (legal content, deferred to content phase).
