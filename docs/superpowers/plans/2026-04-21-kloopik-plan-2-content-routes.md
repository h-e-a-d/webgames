# Kloopik — Plan 2: Content & Routes (Phases 2–3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty Astro scaffold from Plan 1 into a fully browseable games portal with a real content model, five game detail pages, one blog post, all static pages, category listings, sitemaps, RSS, `llms.txt`, and JSON-LD structured data. No interactivity beyond the consent banner yet — favorites, search, and ingest land in Plan 3.

**Architecture:** Two Astro Content Collections (`games`, `blog`) with full Zod schemas. A GameMonetize provider adapter reads a normalized `Game` type and can fetch/download thumbnails (used in Plan 3 for ingest; fetchable by hand today). A three-layer sorting resolver (pinned lists, frontmatter rank, default sort) drives every listing. JSON-LD (`VideoGame`, `Article`, `BreadcrumbList`) renders per page from a typed helper. Site navigation stays minimal (header with category dropdown, footer with static links).

**Tech Stack:** Astro 5, TypeScript strict, Zod (via Astro Content Collections), `@astrojs/sitemap`, `@astrojs/rss`, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-21-kloopik-games-portal-design.md`

**Entry state:** Plan 1 complete. Production site at `https://www.kloopik.com` serves the "Coming soon" placeholder with consent + analytics wired.

**Out of scope for this plan:** Favorites island, search, OG image generation, ingest script, GitHub Actions, launch activities. Those are Plan 3.

---

## File inventory for this plan

**Created:**
- `src/content/config.ts` — **rewritten** with full schemas
- `src/content/games/*.md` — 5 seed games
- `src/content/blog/2026-05-01-why-browser-games-are-thriving.md` — 1 seed post
- `src/data/categories.ts` — canonical category list
- `src/data/featured.ts` — per-surface pinned slug arrays
- `src/lib/providers/types.ts` — `NormalizedGame`, `Provider`
- `src/lib/providers/gamemonetize.ts` — adapter (fetch + normalize)
- `src/lib/providers/index.ts` — registry
- `src/lib/sort.ts` — `sortedGames()` resolver + helpers
- `src/lib/storage.ts` — localStorage wrapper
- `src/lib/seo.ts` — title/description/canonical/OG/JSON-LD helpers
- `src/lib/games.ts` — content-collection read helpers (`getAllGames`, `getGame`, etc.)
- `src/components/Header.astro`
- `src/components/Footer.astro`
- `src/components/GameCard.astro`
- `src/components/GameGrid.astro`
- `src/components/CategoryFilter.astro`
- `src/components/Breadcrumbs.astro`
- `src/components/GamePlayer.astro` — deferred iframe with "Play" button
- `src/components/JsonLd.astro` — JSON-LD script tag wrapper
- `src/layouts/GameLayout.astro`
- `src/layouts/BlogLayout.astro`
- `src/pages/games/index.astro`
- `src/pages/games/[slug].astro`
- `src/pages/categories/[category].astro`
- `src/pages/blog/index.astro`
- `src/pages/blog/[slug].astro`
- `src/pages/about.astro`
- `src/pages/privacy.astro`
- `src/pages/terms.astro`
- `src/pages/rss.xml.ts`
- `src/pages/llms.txt.ts`
- `public/thumbnails/gamemonetize/*.webp` — 5 hand-downloaded seed thumbnails
- `public/og/default.png` — 1200×630 default OG fallback
- Unit tests: `tests/unit/sort.test.ts`, `tests/unit/storage.test.ts`, `tests/unit/seo.test.ts`, `tests/unit/providers-gamemonetize.test.ts`, `tests/fixtures/gamemonetize-feed.json`

**Modified:**
- `package.json` — add `@astrojs/sitemap`, `@astrojs/rss`, `@astrojs/mdx`
- `astro.config.mjs` — register integrations
- `src/layouts/BaseLayout.astro` — add JSON-LD slot, description props defaulting, OG tags
- `src/pages/index.astro` — replace placeholder with real home
- `src/pages/404.astro` — updated navigation
- `public/robots.txt` — confirmed to reference `/sitemap-index.xml`

**Deleted:**
- `src/content/games/.gitkeep` — no longer needed once real games exist
- `src/content/blog/.gitkeep` — same

---

## Task 1: Install route/feed integrations

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Install integrations**

```bash
cd /Users/egalvans/Downloads/Head/Claude/portal
npm install @astrojs/sitemap @astrojs/rss @astrojs/mdx
```

Expected: all three added as dependencies.

- [ ] **Step 2: Register sitemap and MDX in `astro.config.mjs`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://www.kloopik.com',
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/admin') &&
        !page.includes('/draft'),
      changefreq: 'weekly',
      priority: 0.7,
    }),
    mdx(),
  ],
});
```

(RSS is not an integration — it's a per-route endpoint. We'll build it in Task 19.)

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

Expected: `dist/sitemap-index.xml` and `dist/sitemap-0.xml` now exist. Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json astro.config.mjs
git commit -m "feat: register @astrojs/sitemap and mdx integrations"
```

---

## Task 2: Canonical category list

**Files:**
- Create: `src/data/categories.ts`

Categories are a closed set. Games reference categories by id. Adding one requires editing this file — stops typos from spawning ghost categories.

- [ ] **Step 1: Create `src/data/categories.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/data/categories.ts`:

```ts
export interface Category {
  id: string;           // URL slug
  name: string;         // display name
  description: string;  // short intro for /categories/[id]/ page (≥1 sentence)
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'puzzle',
    name: 'Puzzle',
    description: 'Brain teasers, logic games, and pattern-matching challenges you can play in a browser.',
  },
  {
    id: 'arcade',
    name: 'Arcade',
    description: 'Fast-paced score chasers and classic arcade mechanics, all playable instantly in your browser.',
  },
  {
    id: 'action',
    name: 'Action',
    description: 'Reaction-heavy browser games: shooters, platformers, and fast-twitch fun.',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Quick, low-pressure games perfect for short breaks. Easy to pick up, easy to put down.',
  },
  {
    id: 'strategy',
    name: 'Strategy',
    description: 'Turn-based and real-time games that reward planning over reflexes.',
  },
  {
    id: 'io',
    name: '.io games',
    description: 'Massively-multiplayer arena games — the genre that started with Agar.io.',
  },
] as const;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export type CategoryId = (typeof CATEGORY_IDS)[number];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/categories.ts
git commit -m "feat: define canonical category list"
```

---

## Task 3: Full content collection schemas

**Files:**
- Modify: `src/content/config.ts`

The minimal skeleton from Plan 1 Task 12 is replaced with the full schemas from the spec.

- [ ] **Step 1: Rewrite `src/content/config.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { CATEGORY_IDS } from '../data/categories';

const CATEGORY_ENUM = z.enum(CATEGORY_IDS as [string, ...string[]]);

const gameProviderEnum = z.enum(['gamemonetize']);

const controlsSchema = z.enum(['mouse', 'keyboard', 'touch']);
const orientationSchema = z.enum(['landscape', 'portrait', 'both']);

const gamesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(100),
    provider: gameProviderEnum,
    providerId: z.string().min(1),
    embedUrl: z.string().url(),
    thumbnail: z.object({
      src: z.string().min(1),     // relative to /public or external URL
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    categories: z.array(CATEGORY_ENUM).min(1),
    tags: z.array(z.string()).default([]),
    controls: z.array(controlsSchema).min(1),
    orientation: orientationSchema.default('landscape'),
    addedAt: z.coerce.date(),
    featured: z.boolean().default(false),
    rank: z.number().int().positive().optional(),
    draft: z.boolean().default(false),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(200),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    hero: z.object({
      src: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      alt: z.string(),
    }).optional(),
    relatedGames: z.array(z.string()).default([]),   // slugs; runtime-checked in Task 5
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  games: gamesCollection,
  blog: blogCollection,
};
```

- [ ] **Step 2: Verify schema doesn't break the empty build**

```bash
npm run build
```

Expected: build succeeds. No games or blog posts exist yet, so no validation triggers.

- [ ] **Step 3: Commit**

```bash
git add src/content/config.ts
git commit -m "feat: full zod schemas for games and blog collections"
```

---

## Task 4: NormalizedGame + Provider types

**Files:**
- Create: `src/lib/providers/types.ts`

This is the shared interface that lets adapters swap cleanly. Game frontmatter and the `NormalizedGame` type match 1:1 so adapter output can be written directly to markdown.

- [ ] **Step 1: Create `src/lib/providers/types.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/providers/types.ts`:

```ts
import type { CategoryId } from '../../data/categories';

export interface NormalizedThumbnail {
  src: string;      // absolute URL when emitted by an adapter; relative after local download
  width: number;
  height: number;
}

export interface NormalizedGame {
  slug: string;                        // URL-safe, unique across all providers
  title: string;
  provider: 'gamemonetize';
  providerId: string;
  embedUrl: string;
  thumbnail: NormalizedThumbnail;
  categories: CategoryId[];
  tags: string[];
  controls: Array<'mouse' | 'keyboard' | 'touch'>;
  orientation: 'landscape' | 'portrait' | 'both';
  description: string;                 // raw provider description; used as draft body
}

export interface Provider {
  id: NormalizedGame['provider'];
  displayName: string;
  fetchCatalog(opts?: { limit?: number }): Promise<NormalizedGame[]>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/providers/types.ts
git commit -m "feat: NormalizedGame and Provider interfaces"
```

---

## Task 5: Game/blog read helpers (with referential integrity)

**Files:**
- Create: `src/lib/games.ts`

One place to fetch games/blog with draft filtering and internal consistency checks.

- [ ] **Step 1: Create `src/lib/games.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/games.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';

export type GameEntry = CollectionEntry<'games'>;
export type BlogEntry = CollectionEntry<'blog'>;

const isProd = import.meta.env.PROD;

export async function getAllGames(): Promise<GameEntry[]> {
  const all = await getCollection('games');
  return isProd ? all.filter((g) => !g.data.draft) : all;
}

export async function getAllBlog(): Promise<BlogEntry[]> {
  const all = await getCollection('blog');
  return isProd ? all.filter((p) => !p.data.draft) : all;
}

export async function getGameBySlug(slug: string): Promise<GameEntry | undefined> {
  const all = await getAllGames();
  return all.find((g) => g.slug === slug);
}

export async function getGamesByCategory(categoryId: string): Promise<GameEntry[]> {
  const all = await getAllGames();
  return all.filter((g) => g.data.categories.includes(categoryId));
}

export async function getGamesBySlugs(slugs: string[]): Promise<GameEntry[]> {
  const all = await getAllGames();
  const bySlug = new Map(all.map((g) => [g.slug, g] as const));
  // Drop unknown slugs silently — validated strictly at build time via `assertSlugsResolve` if desired.
  return slugs.map((s) => bySlug.get(s)).filter((g): g is GameEntry => g !== undefined);
}

/** Build-time integrity check: throws if any slug in `slugs` does not exist. */
export async function assertSlugsResolve(slugs: string[], context: string): Promise<void> {
  const all = await getAllGames();
  const known = new Set(all.map((g) => g.slug));
  const missing = slugs.filter((s) => !known.has(s));
  if (missing.length > 0) {
    throw new Error(`${context}: unknown game slugs: ${missing.join(', ')}`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/games.ts
git commit -m "feat: content-collection read helpers with draft filtering"
```

---

## Task 6: localStorage wrapper (TDD)

**Files:**
- Create: `src/lib/storage.ts`
- Create: `tests/unit/storage.test.ts`

Thin wrapper used by the favorites island in Plan 3. Centralizing now so the call site is consistent and tested.

- [ ] **Step 1: Write the failing test**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { readList, writeList, addToList, removeFromList, isInList } from '../../src/lib/storage';

const KEY = 'kloopik.test.list';

describe('storage list helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('readList', () => {
    it('returns [] when nothing stored', () => {
      expect(readList(KEY)).toEqual([]);
    });

    it('returns [] when stored value is not an array', () => {
      localStorage.setItem(KEY, JSON.stringify({ not: 'array' }));
      expect(readList(KEY)).toEqual([]);
    });

    it('returns [] when stored value is malformed JSON', () => {
      localStorage.setItem(KEY, 'not-json');
      expect(readList(KEY)).toEqual([]);
    });

    it('filters to strings only', () => {
      localStorage.setItem(KEY, JSON.stringify(['a', 1, 'b', null, 'c']));
      expect(readList(KEY)).toEqual(['a', 'b', 'c']);
    });

    it('returns the stored array when valid', () => {
      localStorage.setItem(KEY, JSON.stringify(['x', 'y']));
      expect(readList(KEY)).toEqual(['x', 'y']);
    });
  });

  describe('writeList / addToList / removeFromList / isInList', () => {
    it('writeList persists', () => {
      writeList(KEY, ['a', 'b']);
      expect(readList(KEY)).toEqual(['a', 'b']);
    });

    it('addToList appends uniquely, preserving order', () => {
      addToList(KEY, 'a');
      addToList(KEY, 'b');
      addToList(KEY, 'a');  // duplicate, ignored
      expect(readList(KEY)).toEqual(['a', 'b']);
    });

    it('removeFromList removes by value', () => {
      writeList(KEY, ['a', 'b', 'c']);
      removeFromList(KEY, 'b');
      expect(readList(KEY)).toEqual(['a', 'c']);
    });

    it('removeFromList is a no-op when value is absent', () => {
      writeList(KEY, ['a']);
      removeFromList(KEY, 'x');
      expect(readList(KEY)).toEqual(['a']);
    });

    it('isInList reports membership', () => {
      writeList(KEY, ['a', 'b']);
      expect(isInList(KEY, 'a')).toBe(true);
      expect(isInList(KEY, 'z')).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
npm run test
```

Expected: fails with "Cannot find module '../../src/lib/storage'".

- [ ] **Step 3: Implement `src/lib/storage.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/storage.ts`:

```ts
export function readList(key: string): string[] {
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

export function writeList(key: string, values: string[]): void {
  localStorage.setItem(key, JSON.stringify(values));
}

export function addToList(key: string, value: string): void {
  const list = readList(key);
  if (list.includes(value)) return;
  list.push(value);
  writeList(key, list);
}

export function removeFromList(key: string, value: string): void {
  const list = readList(key);
  const next = list.filter((v) => v !== value);
  writeList(key, next);
}

export function isInList(key: string, value: string): boolean {
  return readList(key).includes(value);
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts tests/unit/storage.test.ts
git commit -m "feat: localStorage list helpers with unit tests"
```

---

## Task 7: sortedGames resolver (TDD)

**Files:**
- Create: `src/lib/sort.ts`
- Create: `tests/unit/sort.test.ts`

Three-layer resolution (per-surface pins → frontmatter rank → default sort). Pure function of (entries, surface, opts). Tested against synthetic game objects.

- [ ] **Step 1: Write the failing test**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/sort.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sortGames, type SortableGame, type Pins } from '../../src/lib/sort';

function mkGame(
  slug: string,
  opts: Partial<Pick<SortableGame, 'featured' | 'rank' | 'addedAt' | 'categories'>> = {},
): SortableGame {
  return {
    slug,
    featured: opts.featured ?? false,
    rank: opts.rank,
    addedAt: opts.addedAt ?? new Date('2026-01-01'),
    categories: opts.categories ?? ['puzzle'],
  };
}

describe('sortGames', () => {
  it('orders pinned slugs first in exact order', () => {
    const games = [
      mkGame('a'),
      mkGame('b'),
      mkGame('c'),
    ];
    const pins: Pins = { home: { hero: [], featured: ['c', 'a'] }, categoryPins: {} };
    const result = sortGames(games, { surface: 'home-featured', pins });
    expect(result.map((g) => g.slug)).toEqual(['c', 'a', 'b']);
  });

  it('falls back to rank (asc) after pins', () => {
    const games = [
      mkGame('a', { rank: 20 }),
      mkGame('b', { rank: 10 }),
      mkGame('c'),
    ];
    const pins: Pins = { home: { hero: [], featured: [] }, categoryPins: {} };
    const result = sortGames(games, { surface: 'home-featured', pins });
    expect(result.map((g) => g.slug)).toEqual(['b', 'a', 'c']);
  });

  it('default sort prefers featured then addedAt desc', () => {
    const games = [
      mkGame('old', { addedAt: new Date('2026-01-01'), featured: false }),
      mkGame('new', { addedAt: new Date('2026-03-01'), featured: false }),
      mkGame('feat', { addedAt: new Date('2026-02-01'), featured: true }),
    ];
    const pins: Pins = { home: { hero: [], featured: [] }, categoryPins: {} };
    const result = sortGames(games, { surface: 'all', pins });
    expect(result.map((g) => g.slug)).toEqual(['feat', 'new', 'old']);
  });

  it('dedupes: pinned games do not reappear in fallback pool', () => {
    const games = [mkGame('a'), mkGame('b'), mkGame('c')];
    const pins: Pins = { home: { hero: ['b'], featured: ['a'] }, categoryPins: {} };
    const result = sortGames(games, { surface: 'home-hero', pins });
    expect(result.map((g) => g.slug)).toEqual(['b', 'a', 'c']);
    // 'b' must not appear twice
    const slugCounts: Record<string, number> = {};
    for (const g of result) slugCounts[g.slug] = (slugCounts[g.slug] ?? 0) + 1;
    expect(Object.values(slugCounts).every((n) => n === 1)).toBe(true);
  });

  it('category surface scopes to category pins', () => {
    const games = [
      mkGame('p1', { categories: ['puzzle'] }),
      mkGame('p2', { categories: ['puzzle'] }),
      mkGame('a1', { categories: ['arcade'] }),
    ];
    const pins: Pins = {
      home: { hero: [], featured: [] },
      categoryPins: { puzzle: ['p2'] },
    };
    const result = sortGames(games, { surface: 'category', category: 'puzzle', pins });
    expect(result.map((g) => g.slug)).toEqual(['p2', 'p1']);
  });

  it('ignores pins that reference unknown slugs', () => {
    const games = [mkGame('a'), mkGame('b')];
    const pins: Pins = { home: { hero: ['missing'], featured: ['a'] }, categoryPins: {} };
    const result = sortGames(games, { surface: 'home-hero', pins });
    expect(result.map((g) => g.slug)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Run and verify fail**

```bash
npm run test
```

Expected: fails with module not found.

- [ ] **Step 3: Implement `src/lib/sort.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/sort.ts`:

```ts
import type { CategoryId } from '../data/categories';

export interface SortableGame {
  slug: string;
  featured: boolean;
  rank?: number;
  addedAt: Date;
  categories: CategoryId[];
}

export interface Pins {
  home: { hero: string[]; featured: string[] };
  categoryPins: Record<string, string[]>;
}

export type Surface =
  | 'home-hero'
  | 'home-featured'
  | 'all'
  | 'category';

export interface SortOptions {
  surface: Surface;
  pins: Pins;
  category?: CategoryId;
}

export function sortGames<G extends SortableGame>(games: G[], opts: SortOptions): G[] {
  const bySlug = new Map<string, G>(games.map((g) => [g.slug, g] as const));

  const pinned = resolvePinnedSlugs(opts);

  const pinnedGames: G[] = [];
  const pinnedSet = new Set<string>();
  for (const slug of pinned) {
    const g = bySlug.get(slug);
    if (g === undefined) continue;  // unknown slug in pins list — ignore
    pinnedGames.push(g);
    pinnedSet.add(slug);
  }

  const scoped = opts.surface === 'category' && opts.category !== undefined
    ? games.filter((g) => g.categories.includes(opts.category!))
    : games;

  const remaining = scoped.filter((g) => !pinnedSet.has(g.slug));

  const ranked = remaining.filter((g) => g.rank !== undefined);
  ranked.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const unranked = remaining.filter((g) => g.rank === undefined);
  unranked.sort((a, b) => defaultCompare(a, b));

  return [...pinnedGames, ...ranked, ...unranked];
}

function resolvePinnedSlugs(opts: SortOptions): string[] {
  switch (opts.surface) {
    case 'home-hero':
      return opts.pins.home.hero;
    case 'home-featured':
      return opts.pins.home.featured;
    case 'category':
      return opts.category !== undefined
        ? opts.pins.categoryPins[opts.category] ?? []
        : [];
    case 'all':
    default:
      return [];
  }
}

function defaultCompare(a: SortableGame, b: SortableGame): number {
  // featured first
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  // then addedAt desc
  return b.addedAt.getTime() - a.addedAt.getTime();
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all sort tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sort.ts tests/unit/sort.test.ts
git commit -m "feat: three-layer sort resolver (pins, rank, default) with tests"
```

---

## Task 8: featured / pins data file

**Files:**
- Create: `src/data/featured.ts`

- [ ] **Step 1: Create `src/data/featured.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/data/featured.ts`:

```ts
import type { Pins } from '../lib/sort';

/**
 * Per-surface pinned slugs. Slugs must refer to non-draft games in src/content/games/.
 * Unknown slugs are silently ignored at build time (see sortGames tests).
 *
 * Keep these lists short — they override the default sort, so they're a curation scalpel.
 */
export const PINS: Pins = {
  home: {
    hero: [
      // Top of homepage hero row, in exact order
      // (seed slugs added as part of Task 9)
    ],
    featured: [
      // Featured grid on homepage, in exact order
    ],
  },
  categoryPins: {
    // e.g. puzzle: ['2048', 'sudoku-classic']
  },
};
```

(We'll fill this in Task 9 once seed games exist.)

- [ ] **Step 2: Commit**

```bash
git add src/data/featured.ts
git commit -m "feat: featured/pins data file scaffold"
```

---

## Task 9: Seed 5 game markdown files + thumbnails

**Files:**
- Create: `src/content/games/{slug}.md` × 5
- Create: `public/thumbnails/gamemonetize/{id}.webp` × 5
- Delete: `src/content/games/.gitkeep`
- Modify: `src/data/featured.ts` (add slugs)

Five seed games exercise the schema, the listings, the category pages, and the sort resolver with real data. They're hand-authored (ingest script arrives in Plan 3).

Pick 5 real games from the GameMonetize catalog (https://gamemonetize.com/). Download each thumbnail manually into `public/thumbnails/gamemonetize/<providerId>.webp` (convert with `cwebp` or ImageMagick if the source is JPG/PNG). Standard thumbnail: 512×384 or similar.

For this plan we'll show the **structure** of one game file and require the executor to fill in the other four with real games. (The alternative — hard-coding 5 specific games here — makes the plan instantly stale when a game gets removed from GameMonetize.)

- [ ] **Step 1: Pick 5 games from gamemonetize.com**

Browse https://gamemonetize.com/games. Choose 5 that:
- Span at least 3 different categories from `src/data/categories.ts`
- Have iframe embed URLs starting with `https://html5.gamemonetize.co/`
- Have clear, non-controversial content (no heavy gambling/violence imagery)

Record for each: title, provider ID (visible in URL), embed URL, thumbnail URL, controls, orientation.

- [ ] **Step 2: Download thumbnails**

For each of the 5 games:

```bash
mkdir -p public/thumbnails/gamemonetize
# Example — repeat for each game with the real thumbnail URL
curl -o /tmp/raw.jpg "https://img.gamemonetize.com/<providerId>/512x384.jpg"
# Convert to webp (install cwebp via brew install webp if missing)
cwebp -q 80 /tmp/raw.jpg -o public/thumbnails/gamemonetize/<providerId>.webp
```

- [ ] **Step 3: Write the first seed game**

Example — adapt for the specific game chosen.

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/content/games/<slug>.md`:

```markdown
---
title: <Game Title>
provider: gamemonetize
providerId: <their-provider-id>
embedUrl: https://html5.gamemonetize.co/<providerId>/
thumbnail:
  src: /thumbnails/gamemonetize/<providerId>.webp
  width: 512
  height: 384
categories: [puzzle]
tags: [numbers, logic, singleplayer]
controls: [mouse, keyboard]
orientation: landscape
addedAt: 2026-04-21
featured: true
draft: false
---

<Game Title> is a <genre> browser game where <one-sentence mechanic>. <Second factual sentence about what makes it distinct.>

## How it plays

<2–3 sentences on feel, controls, pacing.>

## What's good

<Short paragraph — one or two strengths.>

## What's not

<Short paragraph — one or two weaknesses or caveats.>

## If you like this

Try <link to another on-site game>, or <another>.
```

**Template rules to follow** (from the spec's editorial guidance):

1. The **first sentence** is factual and citable — a single complete sentence stating what the game is.
2. Keep the body 200–400 words total.
3. Use "##" headings, never "#" (the page uses `<h1>` for the title).

- [ ] **Step 4: Write the remaining 4 seed games**

Repeat Step 3 for four more games spanning at least three categories. Example slug set: `2048`, `stickman-archer`, `bubble-shooter`, `pac-runner`, `daily-crossword`. Your final slugs depend on what's available; pick real, playable games.

- [ ] **Step 5: Delete the placeholder**

```bash
rm -f src/content/games/.gitkeep
```

- [ ] **Step 6: Populate `src/data/featured.ts`**

Edit `/Users/egalvans/Downloads/Head/Claude/portal/src/data/featured.ts` — replace the empty arrays with the real slugs:

```ts
import type { Pins } from '../lib/sort';

export const PINS: Pins = {
  home: {
    hero: ['<slug-a>', '<slug-b>'],        // your top 2 choices for hero
    featured: ['<slug-c>', '<slug-d>', '<slug-e>'],
  },
  categoryPins: {
    // Optional: pin one specific game to the top of one category page
    // puzzle: ['<slug-a>'],
  },
};
```

- [ ] **Step 7: Verify build with content**

```bash
npm run build
```

Expected: build succeeds. Any Zod violation (unknown category, missing field, malformed URL) will fail loudly here — good.

- [ ] **Step 8: Commit**

```bash
git add src/content/games/ public/thumbnails/ src/data/featured.ts
git commit -m "feat: seed 5 hand-curated games with thumbnails and pins"
```

---

## Task 10: Seed 1 blog post

**Files:**
- Create: `src/content/blog/2026-05-01-why-browser-games-are-thriving.md`
- Delete: `src/content/blog/.gitkeep`

- [ ] **Step 1: Write the seed blog post**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/content/blog/2026-05-01-why-browser-games-are-thriving.md`:

```markdown
---
title: Why browser games are thriving in 2026
description: Instant-play, zero-install, and surprising depth — a look at the 2026 browser-gaming scene.
publishedAt: 2026-05-01
tags: [meta, industry]
relatedGames: [<slug-a>, <slug-b>]   # real slugs from Task 9
draft: false
---

Browser games used to mean Flash, and Flash is long gone. What's replaced it — WebAssembly, WebGL 2, robust HTML5 canvas, and stable touch input — quietly became one of the most friction-free gaming platforms around. No install, no account, no 40-gigabyte patch.

## Zero friction is the feature

The whole value proposition of a browser game is one click. A landing page, a play button, and you're in. For short-session games — coffee-break puzzles, a quick .io match, a classic like <link to a real seed game> — that's the entire experience, and nothing about installing a client would make it better.

## The quality floor has risen

A decade ago "browser game" meant "worse than a console game." Today it mostly means "designed around a 5-minute session instead of a 50-hour one." That's a different axis, not a worse one.

## What this site is

Kloopik collects browser games that are worth your time. No endless scroll of shovelware. Every game listed has been picked and reviewed. Start with our <link to another real seed game> or browse the [puzzle](/categories/puzzle/) section.
```

Adjust internal links to actual seed slugs. Keep the post short and link-heavy — it's a light seed, not a capstone piece.

- [ ] **Step 2: Delete the placeholder**

```bash
rm -f src/content/blog/.gitkeep
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/
git commit -m "feat: seed first blog post"
```

---

## Task 11: SEO helpers (TDD)

**Files:**
- Create: `src/lib/seo.ts`
- Create: `tests/unit/seo.test.ts`

Per-page helpers for title, description, canonical, OG, and JSON-LD builders. Pure functions, easy to test.

- [ ] **Step 1: Write the failing test**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/seo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildGameTitle,
  buildGameDescription,
  truncate,
  buildVideoGameJsonLd,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
} from '../../src/lib/seo';

describe('seo helpers', () => {
  describe('buildGameTitle', () => {
    it('formats with brand suffix', () => {
      expect(buildGameTitle('2048')).toBe('2048 — Play Free Online | Kloopik');
    });

    it('keeps under 60 chars for short titles', () => {
      expect(buildGameTitle('Hex').length).toBeLessThan(60);
    });
  });

  describe('truncate', () => {
    it('truncates with ellipsis past limit', () => {
      expect(truncate('hello world', 5)).toBe('hello…');
    });

    it('returns input unchanged under limit', () => {
      expect(truncate('short', 100)).toBe('short');
    });

    it('trims trailing whitespace before ellipsis', () => {
      expect(truncate('hello    world', 6)).toBe('hello…');
    });
  });

  describe('buildGameDescription', () => {
    it('uses first 150 chars of body, trimmed cleanly', () => {
      const body = 'Slither.io is a multiplayer snake game where you grow by eating pellets. Other players are your obstacles.';
      expect(buildGameDescription(body).length).toBeLessThanOrEqual(155);
      expect(buildGameDescription(body).startsWith('Slither')).toBe(true);
    });
  });

  describe('buildVideoGameJsonLd', () => {
    it('emits required VideoGame fields', () => {
      const jsonLd = buildVideoGameJsonLd({
        name: 'Test',
        description: 'A test game.',
        url: 'https://www.kloopik.com/games/test/',
        image: 'https://www.kloopik.com/thumbnails/test.webp',
        genre: ['Puzzle'],
      });
      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('VideoGame');
      expect(jsonLd.name).toBe('Test');
      expect(jsonLd.gamePlatform).toBe('Web');
      expect(jsonLd.operatingSystem).toBe('Web');
    });
  });

  describe('buildArticleJsonLd', () => {
    it('emits required Article fields', () => {
      const jsonLd = buildArticleJsonLd({
        headline: 'Hello',
        description: 'A test post.',
        url: 'https://www.kloopik.com/blog/hello/',
        datePublished: '2026-05-01',
      });
      expect(jsonLd['@type']).toBe('Article');
      expect(jsonLd.headline).toBe('Hello');
      expect(jsonLd.datePublished).toBe('2026-05-01');
    });
  });

  describe('buildBreadcrumbJsonLd', () => {
    it('emits BreadcrumbList with positioned items', () => {
      const jsonLd = buildBreadcrumbJsonLd([
        { name: 'Home', url: 'https://www.kloopik.com/' },
        { name: 'Puzzle', url: 'https://www.kloopik.com/categories/puzzle/' },
        { name: '2048', url: 'https://www.kloopik.com/games/2048/' },
      ]);
      expect(jsonLd['@type']).toBe('BreadcrumbList');
      expect(jsonLd.itemListElement).toHaveLength(3);
      expect(jsonLd.itemListElement[0].position).toBe(1);
      expect(jsonLd.itemListElement[2].position).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run to fail**

```bash
npm run test
```

Expected: fails with module not found.

- [ ] **Step 3: Implement `src/lib/seo.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/seo.ts`:

```ts
const BRAND = 'Kloopik';

export function buildGameTitle(name: string): string {
  return `${name} — Play Free Online | ${BRAND}`;
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const sliced = input.slice(0, max).replace(/\s+$/, '');
  return `${sliced}…`;
}

export function buildGameDescription(body: string): string {
  const firstParagraph = body.split(/\n\s*\n/)[0] ?? body;
  const cleaned = firstParagraph.replace(/\s+/g, ' ').trim();
  return truncate(cleaned, 150);
}

export interface VideoGameLdInput {
  name: string;
  description: string;
  url: string;
  image: string;
  genre: string[];
  inLanguage?: string;
}

export function buildVideoGameJsonLd(input: VideoGameLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    genre: input.genre,
    gamePlatform: 'Web',
    operatingSystem: 'Web',
    applicationCategory: 'Game',
    inLanguage: input.inLanguage ?? 'en',
  };
}

export interface ArticleLdInput {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  author?: string;
}

export function buildArticleJsonLd(input: ArticleLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    image: input.image,
    author: {
      '@type': 'Organization',
      name: input.author ?? BRAND,
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND,
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: all SEO tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo.ts tests/unit/seo.test.ts
git commit -m "feat: seo helpers (title, description, json-ld) with tests"
```

---

## Task 12: GameMonetize adapter (TDD with fixtures)

**Files:**
- Create: `src/lib/providers/gamemonetize.ts`
- Create: `src/lib/providers/index.ts`
- Create: `tests/unit/providers-gamemonetize.test.ts`
- Create: `tests/fixtures/gamemonetize-feed.json`

The adapter does not run in this plan (the ingest script is Plan 3) — but we define and test the normalization logic now so Plan 3's ingest script is a thin CLI over a fully-tested core.

- [ ] **Step 1: Create a feed fixture**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/fixtures/gamemonetize-feed.json`:

```json
[
  {
    "title": "Test Puzzle",
    "id": "abc123",
    "url": "https://html5.gamemonetize.co/abc123/",
    "thumb": "https://img.gamemonetize.com/abc123/512x384.jpg",
    "width": 512,
    "height": 384,
    "category": "Puzzles",
    "tags": "puzzle,logic,numbers",
    "description": "A test puzzle game for unit testing.",
    "instructions": "Use mouse and keyboard to play."
  },
  {
    "title": "Shooter Madness",
    "id": "def456",
    "url": "https://html5.gamemonetize.co/def456/",
    "thumb": "https://img.gamemonetize.com/def456/512x384.jpg",
    "width": 512,
    "height": 384,
    "category": "Shooting",
    "tags": "shooter,action",
    "description": "Fast-paced browser shooter.",
    "instructions": "WASD to move, mouse to aim."
  },
  {
    "title": "Unknown Genre",
    "id": "ghi789",
    "url": "https://html5.gamemonetize.co/ghi789/",
    "thumb": "https://img.gamemonetize.com/ghi789/512x384.jpg",
    "width": 512,
    "height": 384,
    "category": "Obscure",
    "tags": "weird",
    "description": "A game with no matching category.",
    "instructions": "Touch to play."
  }
]
```

- [ ] **Step 2: Write the failing tests**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/providers-gamemonetize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeFeed, mapProviderCategory, slugify, detectControls } from '../../src/lib/providers/gamemonetize';

const feed = JSON.parse(
  readFileSync(resolve(__dirname, '../fixtures/gamemonetize-feed.json'), 'utf-8'),
) as unknown[];

describe('gamemonetize adapter', () => {
  describe('slugify', () => {
    it('lowercases and hyphenates', () => {
      expect(slugify('Test Puzzle')).toBe('test-puzzle');
    });

    it('strips punctuation', () => {
      expect(slugify("Sam's BLAST! 3D")).toBe('sams-blast-3d');
    });

    it('handles ampersands and multi-space', () => {
      expect(slugify('Mario  &  Luigi')).toBe('mario-luigi');
    });

    it('falls back to provider id when title produces empty slug', () => {
      expect(slugify('???', 'abc123')).toBe('abc123');
    });
  });

  describe('mapProviderCategory', () => {
    it('maps known provider categories to our canonical ids', () => {
      expect(mapProviderCategory('Puzzles')).toEqual(['puzzle']);
      expect(mapProviderCategory('Shooting')).toEqual(['action']);
      expect(mapProviderCategory('Arcade')).toEqual(['arcade']);
    });

    it('returns ["casual"] for unknown provider categories', () => {
      expect(mapProviderCategory('Obscure')).toEqual(['casual']);
    });

    it('is case-insensitive', () => {
      expect(mapProviderCategory('puzzles')).toEqual(['puzzle']);
    });
  });

  describe('detectControls', () => {
    it('detects keyboard + mouse from instructions', () => {
      expect(detectControls('Use mouse and keyboard to play.')).toEqual(['keyboard', 'mouse']);
    });

    it('detects touch only', () => {
      expect(detectControls('Touch to play.')).toEqual(['touch']);
    });

    it('defaults to mouse when nothing detected', () => {
      expect(detectControls('')).toEqual(['mouse']);
    });
  });

  describe('normalizeFeed', () => {
    it('produces NormalizedGame entries with correct shape', () => {
      const games = normalizeFeed(feed);
      expect(games).toHaveLength(3);
      const puzzle = games[0];
      expect(puzzle.slug).toBe('test-puzzle');
      expect(puzzle.provider).toBe('gamemonetize');
      expect(puzzle.providerId).toBe('abc123');
      expect(puzzle.embedUrl).toBe('https://html5.gamemonetize.co/abc123/');
      expect(puzzle.categories).toEqual(['puzzle']);
      expect(puzzle.thumbnail.width).toBe(512);
      expect(puzzle.thumbnail.height).toBe(384);
    });

    it('ensures unique slugs when titles collide', () => {
      const colliding = [
        { ...(feed[0] as object), id: 'x1' },
        { ...(feed[0] as object), id: 'x2' },
      ];
      const games = normalizeFeed(colliding);
      expect(games.map((g) => g.slug)).toHaveLength(2);
      expect(new Set(games.map((g) => g.slug)).size).toBe(2);
    });

    it('silently drops malformed entries without throwing', () => {
      const dirty = [{ id: 'ok-id' }, ...feed];  // missing title, url, etc.
      const games = normalizeFeed(dirty);
      expect(games).toHaveLength(3);   // only the 3 well-formed ones
    });
  });
});
```

- [ ] **Step 3: Run to fail**

```bash
npm run test
```

Expected: fails with module not found.

- [ ] **Step 4: Implement `src/lib/providers/gamemonetize.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/providers/gamemonetize.ts`:

```ts
import type { NormalizedGame, Provider } from './types';
import type { CategoryId } from '../../data/categories';

interface RawEntry {
  title?: unknown;
  id?: unknown;
  url?: unknown;
  thumb?: unknown;
  width?: unknown;
  height?: unknown;
  category?: unknown;
  tags?: unknown;
  description?: unknown;
  instructions?: unknown;
}

export function slugify(input: string, fallback?: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug.length === 0 && fallback !== undefined) return fallback;
  return slug;
}

const PROVIDER_CATEGORY_MAP: Record<string, CategoryId[]> = {
  puzzles: ['puzzle'],
  puzzle: ['puzzle'],
  shooting: ['action'],
  action: ['action'],
  adventure: ['action'],
  arcade: ['arcade'],
  sports: ['casual'],
  racing: ['arcade'],
  strategy: ['strategy'],
  'io games': ['io'],
  'io-games': ['io'],
  multiplayer: ['io'],
  girls: ['casual'],
  'boys-games': ['casual'],
  clicker: ['casual'],
  hypercasual: ['casual'],
};

export function mapProviderCategory(providerCategory: string): CategoryId[] {
  const normalized = providerCategory.toLowerCase().trim();
  return PROVIDER_CATEGORY_MAP[normalized] ?? ['casual'];
}

export function detectControls(instructions: string): Array<'mouse' | 'keyboard' | 'touch'> {
  const text = instructions.toLowerCase();
  const controls: Array<'mouse' | 'keyboard' | 'touch'> = [];
  if (/\b(touch|tap|swipe)\b/.test(text)) controls.push('touch');
  if (/\b(keyboard|wasd|arrow|space)\b/.test(text)) controls.push('keyboard');
  if (/\b(mouse|click|drag)\b/.test(text)) controls.push('mouse');
  if (controls.length === 0) controls.push('mouse');
  return controls.sort();
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function normalizeEntry(entry: RawEntry): NormalizedGame | null {
  if (!isStr(entry.title) || !isStr(entry.id) || !isStr(entry.url) || !isStr(entry.thumb)) {
    return null;
  }
  const width = isNum(entry.width) ? entry.width : 512;
  const height = isNum(entry.height) ? entry.height : 384;
  const providerCategory = isStr(entry.category) ? entry.category : 'casual';
  const tags = isStr(entry.tags) ? entry.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const description = isStr(entry.description) ? entry.description : '';
  const instructions = isStr(entry.instructions) ? entry.instructions : '';

  return {
    slug: slugify(entry.title, entry.id),
    title: entry.title,
    provider: 'gamemonetize',
    providerId: entry.id,
    embedUrl: entry.url,
    thumbnail: { src: entry.thumb, width, height },
    categories: mapProviderCategory(providerCategory),
    tags,
    controls: detectControls(instructions),
    orientation: height > width ? 'portrait' : 'landscape',
    description,
  };
}

export function normalizeFeed(raw: unknown[]): NormalizedGame[] {
  const seen = new Set<string>();
  const out: NormalizedGame[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const normalized = normalizeEntry(entry as RawEntry);
    if (normalized === null) continue;
    let slug = normalized.slug;
    let n = 2;
    while (seen.has(slug)) {
      slug = `${normalized.slug}-${n}`;
      n++;
    }
    seen.add(slug);
    out.push({ ...normalized, slug });
  }
  return out;
}

export const gamemonetizeProvider: Provider = {
  id: 'gamemonetize',
  displayName: 'GameMonetize',
  async fetchCatalog(opts?: { limit?: number }): Promise<NormalizedGame[]> {
    const url = 'https://gamemonetize.com/feed.php?format=0&type=games&popularity=mostplayed&category=all&amount=100';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`GameMonetize feed request failed: ${res.status} ${res.statusText}`);
    }
    const raw = (await res.json()) as unknown[];
    const limited = typeof opts?.limit === 'number' ? raw.slice(0, opts.limit) : raw;
    return normalizeFeed(limited);
  },
};
```

- [ ] **Step 5: Create the registry**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/providers/index.ts`:

```ts
import type { Provider } from './types';
import { gamemonetizeProvider } from './gamemonetize';

export const PROVIDERS: Record<Provider['id'], Provider> = {
  gamemonetize: gamemonetizeProvider,
};

export function getProvider(id: Provider['id']): Provider {
  const p = PROVIDERS[id];
  if (p === undefined) throw new Error(`Unknown provider: ${id}`);
  return p;
}
```

- [ ] **Step 6: Run tests**

```bash
npm run test
```

Expected: all provider tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/providers/ tests/unit/providers-gamemonetize.test.ts tests/fixtures/
git commit -m "feat: gamemonetize adapter with normalization logic and fixtures"
```

---

## Task 13: Design tokens + expanded global CSS

**Files:**
- Modify: `src/styles/global.css`

Minimal design system: CSS vars for color/space/radius, type scale, grid helper, buttons. No Tailwind. Tokenized so components can compose.

- [ ] **Step 1: Replace `src/styles/global.css`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/styles/global.css`:

```css
:root {
  /* color */
  --color-bg: #ffffff;
  --color-fg: #0f172a;
  --color-muted: #64748b;
  --color-border: #e5e7eb;
  --color-surface: #f8fafc;
  --color-accent: #2563eb;
  --color-accent-fg: #ffffff;
  --color-focus: #60a5fa;

  /* spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* radii */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  /* type */
  --fs-xs: 0.75rem;
  --fs-sm: 0.875rem;
  --fs-md: 1rem;
  --fs-lg: 1.125rem;
  --fs-xl: 1.5rem;
  --fs-2xl: 2rem;
  --fs-3xl: 2.5rem;

  /* layout */
  --container-max: 72rem;
  --header-h: 3.5rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0b0b10;
    --color-fg: #f5f5f7;
    --color-muted: #94a3b8;
    --color-border: #1f2937;
    --color-surface: #111827;
    --color-accent: #60a5fa;
    --color-accent-fg: #0b0b10;
  }
}

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: var(--fs-md);
  line-height: 1.5;
  color: var(--color-fg);
  background: var(--color-bg);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
img, video { max-width: 100%; height: auto; display: block; }
a { color: var(--color-accent); text-decoration: none; }
a:hover, a:focus { text-decoration: underline; }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }

h1, h2, h3 { line-height: 1.2; margin: 0 0 var(--space-4); }
h1 { font-size: var(--fs-3xl); }
h2 { font-size: var(--fs-2xl); }
h3 { font-size: var(--fs-xl); }
p { margin: 0 0 var(--space-4); }

.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--space-4);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: var(--color-accent);
  color: var(--color-accent-fg);
  font-size: var(--fs-md);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.btn:hover, .btn:focus { text-decoration: none; opacity: 0.9; }
.btn-secondary {
  background: transparent;
  color: var(--color-fg);
  border-color: var(--color-border);
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: design tokens and expanded global stylesheet"
```

---

## Task 14: Header + Footer components

**Files:**
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`

- [ ] **Step 1: Create `src/components/Header.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/Header.astro`:

```astro
---
import { CATEGORIES } from '../data/categories';
---
<header class="site-header">
  <div class="container site-header__row">
    <a href="/" class="site-logo" aria-label="Kloopik home">Kloopik</a>
    <nav class="site-nav" aria-label="Primary">
      <ul>
        <li><a href="/games/">All games</a></li>
        {CATEGORIES.slice(0, 5).map((c) => (
          <li><a href={`/categories/${c.id}/`}>{c.name}</a></li>
        ))}
        <li><a href="/blog/">Blog</a></li>
      </ul>
    </nav>
  </div>
</header>

<style>
  .site-header {
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg);
    height: var(--header-h);
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .site-header__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-6);
    width: 100%;
  }
  .site-logo {
    font-size: var(--fs-lg);
    font-weight: 800;
    color: var(--color-fg);
  }
  .site-logo:hover, .site-logo:focus { text-decoration: none; }
  .site-nav ul {
    display: flex;
    gap: var(--space-5);
    list-style: none;
    margin: 0;
    padding: 0;
    flex-wrap: wrap;
  }
  .site-nav a {
    color: var(--color-fg);
    font-size: var(--fs-sm);
    font-weight: 500;
  }
  @media (max-width: 640px) {
    .site-nav { display: none; }  /* TODO Plan 3: mobile menu island */
  }
</style>
```

- [ ] **Step 2: Create `src/components/Footer.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/Footer.astro`:

```astro
---
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="container site-footer__row">
    <p class="site-footer__copy">© {year} Kloopik. Games are the property of their respective owners.</p>
    <nav aria-label="Footer">
      <ul>
        <li><a href="/about/">About</a></li>
        <li><a href="/privacy/">Privacy</a></li>
        <li><a href="/terms/">Terms</a></li>
        <li><a href="/feed.xml">RSS</a></li>
      </ul>
    </nav>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--color-border);
    padding: var(--space-8) 0;
    margin-top: var(--space-12);
    background: var(--color-surface);
    font-size: var(--fs-sm);
    color: var(--color-muted);
  }
  .site-footer__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  .site-footer ul {
    display: flex;
    gap: var(--space-5);
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .site-footer a { color: var(--color-muted); }
</style>
```

- [ ] **Step 3: Mount in BaseLayout**

Edit `/Users/egalvans/Downloads/Head/Claude/portal/src/layouts/BaseLayout.astro` — find the `<body>` section and wrap `<slot />` with header/footer.

Replace the body of BaseLayout (keeping the head untouched) to:

```astro
  <body>
    {shouldLoadGtm && (
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style="display:none;visibility:hidden"
          title="GTM noscript"
        ></iframe>
      </noscript>
    )}
    <Header />
    <main class="page-main">
      <slot />
    </main>
    <Footer />
    <ConsentBanner />

    {(() => {
      const token = import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN;
      const isReal = typeof token === 'string' && /^[a-f0-9]{32}$/i.test(token);
      return isReal ? (
        <script
          is:inline
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={`{"token": "${token}"}`}
        />
      ) : null;
    })()}
  </body>
```

Add `Header` and `Footer` imports at the top of BaseLayout's frontmatter:

```astro
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
```

Also add this to `global.css` so `<main>` expands:

```css
.page-main {
  flex: 1;
  width: 100%;
}
```

(Append to the existing `global.css` — do not replace.)

- [ ] **Step 4: Verify build**

```bash
npm run build
grep -c "site-header" dist/index.html
grep -c "site-footer" dist/index.html
```

Expected: both `1` or more.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.astro src/components/Footer.astro src/layouts/BaseLayout.astro src/styles/global.css
git commit -m "feat: site header and footer in BaseLayout"
```

---

## Task 15: JsonLd component + BaseLayout slot

**Files:**
- Create: `src/components/JsonLd.astro`
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Create the JsonLd component**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/JsonLd.astro`:

```astro
---
interface Props {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}
const { data } = Astro.props;
const json = JSON.stringify(data);
---
<script type="application/ld+json" set:html={json} />
```

`set:html` is correct here — JSON-LD must be emitted verbatim, not HTML-escaped.

- [ ] **Step 2: Add an optional `jsonLd` prop + OG tags to BaseLayout**

Edit `/Users/egalvans/Downloads/Head/Claude/portal/src/layouts/BaseLayout.astro` — in the frontmatter, update the Props interface and destructuring:

```astro
interface Props {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  ogType?: 'website' | 'article';
}

const { title, description, canonicalPath, ogImage, jsonLd, ogType = 'website' } = Astro.props;
const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const gtmId = import.meta.env.PUBLIC_GTM_ID;
const canonical = canonicalPath ? `${siteUrl}${canonicalPath}` : `${siteUrl}${Astro.url.pathname}`;
const ogImageAbs = ogImage ? `${siteUrl}${ogImage}` : `${siteUrl}/og/default.png`;

const shouldLoadGtm = typeof gtmId === 'string' && gtmId.startsWith('GTM-');
```

Add OG and JsonLd to the `<head>` (after the `<meta name="robots">` line, before the GTM block):

```astro
    <meta property="og:type" content={ogType} />
    <meta property="og:title" content={title} />
    {description && <meta property="og:description" content={description} />}
    <meta property="og:url" content={canonical} />
    <meta property="og:image" content={ogImageAbs} />
    <meta property="og:site_name" content="Kloopik" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    {description && <meta name="twitter:description" content={description} />}
    <meta name="twitter:image" content={ogImageAbs} />

    {jsonLd && <JsonLd data={jsonLd} />}
```

Add to the BaseLayout frontmatter imports:

```astro
import JsonLd from '../components/JsonLd.astro';
```

- [ ] **Step 3: Create the default OG image placeholder**

Write a simple 1200×630 PNG to `/Users/egalvans/Downloads/Head/Claude/portal/public/og/default.png`. For this task use a pragmatic approach:

```bash
mkdir -p public/og
# Generate a simple 1200x630 PNG with the brand wordmark.
# If imagemagick isn't available, drop in any 1200x630 PNG for now.
convert -size 1200x630 xc:'#0b0b10' \
  -gravity center \
  -font Helvetica-Bold -pointsize 140 -fill '#f0f0fa' \
  -annotate 0 "Kloopik" \
  public/og/default.png
# If convert isn't installed:
# brew install imagemagick
# or drop any 1200x630 PNG named default.png into public/og/
```

Verify the file is ≥ 1200×630:

```bash
file public/og/default.png
```

Plan 3 adds per-page OG generation. For this plan, every page uses the default.

- [ ] **Step 4: Verify build**

```bash
npm run build
grep -c "og:image" dist/index.html
grep -c "application/ld+json" dist/index.html || echo "0 (expected for home, which doesn't pass jsonLd yet)"
```

Expected: OG image tag present. JSON-LD absent until pages pass it (home still doesn't — OK).

- [ ] **Step 5: Commit**

```bash
git add src/components/JsonLd.astro src/layouts/BaseLayout.astro public/og/
git commit -m "feat: jsonld component and og/twitter meta in BaseLayout"
```

---

## Task 16: GameCard and GameGrid components

**Files:**
- Create: `src/components/GameCard.astro`
- Create: `src/components/GameGrid.astro`

- [ ] **Step 1: Create `src/components/GameCard.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/GameCard.astro`:

```astro
---
import type { GameEntry } from '../lib/games';

interface Props {
  game: GameEntry;
  eager?: boolean;   // first ~8 on page should be eager
}

const { game, eager = false } = Astro.props;
const { data, slug } = game;
---
<a href={`/games/${slug}/`} class="game-card">
  <div class="game-card__thumb">
    <img
      src={data.thumbnail.src}
      width={data.thumbnail.width}
      height={data.thumbnail.height}
      alt={`${data.title} thumbnail`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={eager ? 'high' : 'auto'}
    />
  </div>
  <div class="game-card__meta">
    <h3 class="game-card__title">{data.title}</h3>
    <p class="game-card__cats">{data.categories.join(' · ')}</p>
  </div>
</a>

<style>
  .game-card {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--color-bg);
    color: var(--color-fg);
    text-decoration: none;
    transition: transform 0.12s ease, box-shadow 0.12s ease;
  }
  .game-card:hover, .game-card:focus {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
    text-decoration: none;
  }
  .game-card__thumb {
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: var(--color-surface);
  }
  .game-card__thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .game-card__meta {
    padding: var(--space-3) var(--space-4);
  }
  .game-card__title {
    font-size: var(--fs-md);
    font-weight: 600;
    margin: 0 0 var(--space-1);
  }
  .game-card__cats {
    font-size: var(--fs-xs);
    color: var(--color-muted);
    margin: 0;
    text-transform: capitalize;
  }
</style>
```

- [ ] **Step 2: Create `src/components/GameGrid.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/GameGrid.astro`:

```astro
---
import type { GameEntry } from '../lib/games';
import GameCard from './GameCard.astro';

interface Props {
  games: GameEntry[];
  eagerCount?: number;   // number of above-the-fold cards to load eagerly
}
const { games, eagerCount = 8 } = Astro.props;
---
<ul class="game-grid" role="list">
  {games.map((game, i) => (
    <li><GameCard game={game} eager={i < eagerCount} /></li>
  ))}
</ul>

<style>
  .game-grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .game-grid > li { display: contents; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/GameCard.astro src/components/GameGrid.astro
git commit -m "feat: GameCard and GameGrid components"
```

---

## Task 17: Breadcrumbs + CategoryFilter

**Files:**
- Create: `src/components/Breadcrumbs.astro`
- Create: `src/components/CategoryFilter.astro`

- [ ] **Step 1: Create `src/components/Breadcrumbs.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/Breadcrumbs.astro`:

```astro
---
interface Crumb { name: string; href?: string; }
interface Props { items: Crumb[]; }
const { items } = Astro.props;
---
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    {items.map((item, i) => (
      <li>
        {item.href && i < items.length - 1 ? (
          <a href={item.href}>{item.name}</a>
        ) : (
          <span aria-current="page">{item.name}</span>
        )}
      </li>
    ))}
  </ol>
</nav>

<style>
  .breadcrumbs ol {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-4);
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    font-size: var(--fs-sm);
    color: var(--color-muted);
  }
  .breadcrumbs li:not(:last-child)::after {
    content: '›';
    padding-left: var(--space-2);
  }
  .breadcrumbs a { color: var(--color-muted); }
  .breadcrumbs [aria-current='page'] { color: var(--color-fg); }
</style>
```

- [ ] **Step 2: Create `src/components/CategoryFilter.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/CategoryFilter.astro`:

```astro
---
import { CATEGORIES } from '../data/categories';

interface Props { activeId?: string | 'all'; }
const { activeId = 'all' } = Astro.props;
---
<nav class="cat-filter" aria-label="Filter by category">
  <ul>
    <li>
      <a
        href="/games/"
        class:list={['cat-filter__chip', { 'is-active': activeId === 'all' }]}
        aria-current={activeId === 'all' ? 'page' : undefined}
      >All</a>
    </li>
    {CATEGORIES.map((c) => (
      <li>
        <a
          href={`/categories/${c.id}/`}
          class:list={['cat-filter__chip', { 'is-active': activeId === c.id }]}
          aria-current={activeId === c.id ? 'page' : undefined}
        >{c.name}</a>
      </li>
    ))}
  </ul>
</nav>

<style>
  .cat-filter ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: 0;
    margin: 0 0 var(--space-6);
    list-style: none;
  }
  .cat-filter__chip {
    display: inline-block;
    padding: var(--space-2) var(--space-4);
    border-radius: 999px;
    border: 1px solid var(--color-border);
    font-size: var(--fs-sm);
    color: var(--color-fg);
    background: var(--color-bg);
  }
  .cat-filter__chip:hover, .cat-filter__chip:focus { text-decoration: none; background: var(--color-surface); }
  .cat-filter__chip.is-active {
    background: var(--color-fg);
    color: var(--color-bg);
    border-color: var(--color-fg);
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Breadcrumbs.astro src/components/CategoryFilter.astro
git commit -m "feat: Breadcrumbs and CategoryFilter components"
```

---

## Task 18: Home page

**Files:**
- Modify: `src/pages/index.astro`

The home page is a hero strip (first pinned games) + featured grid + recent. Home is not filterable — the filter UI lives on `/games/`.

- [ ] **Step 1: Replace `src/pages/index.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/index.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import GameGrid from '../components/GameGrid.astro';
import { getAllGames, assertSlugsResolve } from '../lib/games';
import { sortGames } from '../lib/sort';
import { PINS } from '../data/featured';

const games = await getAllGames();

// Fail the build if pins reference missing games — caught once, here.
await assertSlugsResolve([...PINS.home.hero, ...PINS.home.featured], 'PINS.home');

const sortable = games.map((g) => ({
  slug: g.slug,
  featured: g.data.featured,
  rank: g.data.rank,
  addedAt: g.data.addedAt,
  categories: g.data.categories,
}));

const heroSlugs = sortGames(sortable, { surface: 'home-hero', pins: PINS }).map((g) => g.slug).slice(0, 3);
const featuredSlugs = sortGames(sortable, { surface: 'home-featured', pins: PINS }).map((g) => g.slug).slice(0, 12);

const bySlug = new Map(games.map((g) => [g.slug, g] as const));
const heroGames = heroSlugs.map((s) => bySlug.get(s)!).filter((g) => g !== undefined);
const featuredGames = featuredSlugs.map((s) => bySlug.get(s)!).filter((g) => g !== undefined);
---
<BaseLayout
  title="Kloopik — Curated browser games, zero install"
  description="A curated collection of free browser games. Puzzles, arcade, action, and more — instantly playable, no sign-up."
  canonicalPath="/"
>
  <section class="hero container">
    <h1>Free browser games, hand-picked.</h1>
    <p>No installs, no accounts. Just games that are worth your time.</p>
  </section>

  {heroGames.length > 0 && (
    <section class="container">
      <h2>Top picks</h2>
      <GameGrid games={heroGames} eagerCount={heroGames.length} />
    </section>
  )}

  {featuredGames.length > 0 && (
    <section class="container section-spacing">
      <h2>Featured</h2>
      <GameGrid games={featuredGames} eagerCount={8} />
    </section>
  )}
</BaseLayout>

<style>
  .hero {
    padding: var(--space-12) 0 var(--space-8);
    text-align: center;
  }
  .hero h1 { font-size: var(--fs-3xl); margin-bottom: var(--space-3); }
  .hero p { color: var(--color-muted); font-size: var(--fs-lg); margin: 0; }
  .section-spacing { margin-top: var(--space-10); }
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds. If PINS references slugs that don't exist in your seed games, the build fails with a clear error — fix `src/data/featured.ts` to match reality.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: home page with pinned hero and featured grid"
```

---

## Task 19: /games/ listing page

**Files:**
- Create: `src/pages/games/index.astro`

All games, filterable, with pagination (simple "show more" via additional pages — Astro `getStaticPaths` for `/games/page/[n]/` arrives only if we need it; start with one page and 50 games per page max).

- [ ] **Step 1: Create `src/pages/games/index.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/games/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import CategoryFilter from '../../components/CategoryFilter.astro';
import GameGrid from '../../components/GameGrid.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import { getAllGames } from '../../lib/games';
import { sortGames } from '../../lib/sort';
import { PINS } from '../../data/featured';
import { buildBreadcrumbJsonLd } from '../../lib/seo';

const games = await getAllGames();

const sortable = games.map((g) => ({
  slug: g.slug,
  featured: g.data.featured,
  rank: g.data.rank,
  addedAt: g.data.addedAt,
  categories: g.data.categories,
}));
const orderedSlugs = sortGames(sortable, { surface: 'all', pins: PINS }).map((g) => g.slug);
const bySlug = new Map(games.map((g) => [g.slug, g] as const));
const ordered = orderedSlugs.map((s) => bySlug.get(s)!).filter((g) => g !== undefined);

const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const breadcrumbLd = buildBreadcrumbJsonLd([
  { name: 'Home', url: `${siteUrl}/` },
  { name: 'All games', url: `${siteUrl}/games/` },
]);
---
<BaseLayout
  title="All games — Kloopik"
  description={`Browse all ${ordered.length} curated browser games on Kloopik. Filter by category.`}
  canonicalPath="/games/"
  jsonLd={breadcrumbLd}
>
  <div class="container">
    <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'All games' }]} />
    <h1>All games</h1>
    <CategoryFilter activeId="all" />
    <GameGrid games={ordered} eagerCount={8} />
  </div>
</BaseLayout>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
ls dist/games/
```

Expected: `dist/games/index.html` exists.

- [ ] **Step 3: Commit**

```bash
git add src/pages/games/index.astro
git commit -m "feat: /games/ listing page with breadcrumb ld"
```

---

## Task 20: GamePlayer component (deferred iframe)

**Files:**
- Create: `src/components/GamePlayer.astro`

Shows a thumbnail + "Play" button. Clicking inserts the iframe, and only then gates on consent.

- [ ] **Step 1: Create `src/components/GamePlayer.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/GamePlayer.astro`:

```astro
---
interface Props {
  title: string;
  embedUrl: string;
  thumbnailSrc: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  orientation: 'landscape' | 'portrait' | 'both';
}

const { title, embedUrl, thumbnailSrc, thumbnailWidth, thumbnailHeight, orientation } = Astro.props;
---
<div
  class="game-player"
  data-embed-url={embedUrl}
  data-orientation={orientation}
>
  <div class="game-player__poster">
    <img
      src={thumbnailSrc}
      width={thumbnailWidth}
      height={thumbnailHeight}
      alt={`${title} — press play to start`}
      loading="eager"
      fetchpriority="high"
      decoding="async"
    />
    <button type="button" class="game-player__play" aria-label={`Play ${title}`}>
      <span aria-hidden="true" class="game-player__play-icon">▶</span>
      Play
    </button>
  </div>
</div>

<style>
  .game-player {
    position: relative;
    width: 100%;
    background: #000;
    border-radius: var(--radius-md);
    overflow: hidden;
    aspect-ratio: 16 / 9;
  }
  .game-player[data-orientation='portrait'] { aspect-ratio: 9 / 16; max-width: 24rem; margin: 0 auto; }
  .game-player__poster, .game-player__poster img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .game-player__play {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: var(--space-3) var(--space-6);
    background: rgba(255,255,255,0.95);
    border: none;
    border-radius: 999px;
    font-weight: 700;
    font-size: var(--fs-lg);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }
  .game-player__play:hover, .game-player__play:focus { background: #fff; }
  .game-player iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
  }
</style>

<script>
  document.querySelectorAll<HTMLElement>('.game-player').forEach((root) => {
    const playBtn = root.querySelector<HTMLButtonElement>('.game-player__play');
    const poster = root.querySelector<HTMLElement>('.game-player__poster');
    const embedUrl = root.dataset.embedUrl;
    if (!playBtn || !poster || !embedUrl) return;

    playBtn.addEventListener('click', () => {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.allow = 'autoplay; fullscreen';
      iframe.allowFullscreen = true;
      iframe.loading = 'eager';
      iframe.title = 'Game';
      poster.style.display = 'none';
      root.appendChild(iframe);
    });
  });
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GamePlayer.astro
git commit -m "feat: GamePlayer component with deferred iframe insertion"
```

---

## Task 21: /games/[slug]/ detail page

**Files:**
- Create: `src/pages/games/[slug].astro`

Full per-game editorial page with breadcrumb, player, review body, metadata sidebar, related-games block, `VideoGame` + `BreadcrumbList` JSON-LD.

- [ ] **Step 1: Create `src/pages/games/[slug].astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/games/[slug].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import GamePlayer from '../../components/GamePlayer.astro';
import GameGrid from '../../components/GameGrid.astro';
import { getAllGames, getGamesByCategory } from '../../lib/games';
import { getCategory } from '../../data/categories';
import {
  buildGameTitle,
  buildGameDescription,
  buildVideoGameJsonLd,
  buildBreadcrumbJsonLd,
} from '../../lib/seo';

export async function getStaticPaths() {
  const games = await getAllGames();
  return games.map((game) => ({ params: { slug: game.slug }, props: { game } }));
}

const { game } = Astro.props;
const { Content } = await game.render();

const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const pagePath = `/games/${game.slug}/`;
const canonical = `${siteUrl}${pagePath}`;

const description = buildGameDescription(game.body);
const firstCategory = game.data.categories[0];
const category = getCategory(firstCategory);

// Related: up to 6 other games in the same primary category.
const related = (await getGamesByCategory(firstCategory))
  .filter((g) => g.slug !== game.slug)
  .slice(0, 6);

const thumbAbs = game.data.thumbnail.src.startsWith('http')
  ? game.data.thumbnail.src
  : `${siteUrl}${game.data.thumbnail.src}`;

const videoGameLd = buildVideoGameJsonLd({
  name: game.data.title,
  description,
  url: canonical,
  image: thumbAbs,
  genre: game.data.categories.map((c) => getCategory(c)?.name ?? c),
});

const breadcrumbLd = buildBreadcrumbJsonLd([
  { name: 'Home', url: `${siteUrl}/` },
  { name: category?.name ?? 'Games', url: `${siteUrl}/categories/${firstCategory}/` },
  { name: game.data.title, url: canonical },
]);
---
<BaseLayout
  title={buildGameTitle(game.data.title)}
  description={description}
  canonicalPath={pagePath}
  ogImage={game.data.thumbnail.src}
  jsonLd={[videoGameLd, breadcrumbLd]}
>
  <div class="container">
    <Breadcrumbs items={[
      { name: 'Home', href: '/' },
      { name: category?.name ?? 'Games', href: `/categories/${firstCategory}/` },
      { name: game.data.title },
    ]} />

    <h1>{game.data.title}</h1>

    <GamePlayer
      title={game.data.title}
      embedUrl={game.data.embedUrl}
      thumbnailSrc={game.data.thumbnail.src}
      thumbnailWidth={game.data.thumbnail.width}
      thumbnailHeight={game.data.thumbnail.height}
      orientation={game.data.orientation}
    />

    <div class="game-layout">
      <article class="game-body">
        <Content />
      </article>
      <aside class="game-meta" aria-label="Game details">
        <dl>
          <dt>Categories</dt>
          <dd>{game.data.categories.map((c) => getCategory(c)?.name ?? c).join(', ')}</dd>
          <dt>Controls</dt>
          <dd>{game.data.controls.join(', ')}</dd>
          <dt>Orientation</dt>
          <dd>{game.data.orientation}</dd>
        </dl>
      </aside>
    </div>

    {related.length > 0 && (
      <section class="section-spacing">
        <h2>If you like this</h2>
        <GameGrid games={related} eagerCount={0} />
      </section>
    )}
  </div>
</BaseLayout>

<style>
  .game-layout {
    display: grid;
    gap: var(--space-6);
    grid-template-columns: minmax(0, 1fr);
    margin-top: var(--space-6);
  }
  @media (min-width: 768px) {
    .game-layout { grid-template-columns: 1fr 18rem; }
  }
  .game-body :global(h2) { font-size: var(--fs-xl); margin-top: var(--space-6); }
  .game-body :global(p) { font-size: var(--fs-md); }
  .game-meta {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    background: var(--color-surface);
    font-size: var(--fs-sm);
  }
  .game-meta dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: var(--space-2) var(--space-4); }
  .game-meta dt { font-weight: 600; color: var(--color-muted); }
  .game-meta dd { margin: 0; }
  .section-spacing { margin-top: var(--space-10); }
</style>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
ls dist/games/
```

Expected: one subdirectory per seed game. Open one: `open dist/games/<slug>/index.html`.

- [ ] **Step 3: Manual check**

```bash
npm run preview
```

Visit `http://localhost:4321/games/<seed-slug>/`. Confirm:
- H1 is the game title
- Breadcrumbs show Home › Category › Title
- Play button renders over thumbnail
- Clicking "Play" inserts the iframe
- Review body renders (from markdown)
- Related games show below

Stop dev server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/pages/games/
git commit -m "feat: /games/[slug]/ detail page with videogame json-ld"
```

---

## Task 22: /categories/[category]/ pages

**Files:**
- Create: `src/pages/categories/[category].astro`

- [ ] **Step 1: Create the route**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/categories/[category].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import CategoryFilter from '../../components/CategoryFilter.astro';
import GameGrid from '../../components/GameGrid.astro';
import { CATEGORIES, getCategory } from '../../data/categories';
import { getAllGames } from '../../lib/games';
import { sortGames } from '../../lib/sort';
import { PINS } from '../../data/featured';
import { buildBreadcrumbJsonLd } from '../../lib/seo';

export async function getStaticPaths() {
  return CATEGORIES.map((c) => ({ params: { category: c.id }, props: { category: c } }));
}

const { category } = Astro.props;
const allGames = await getAllGames();
const sortable = allGames.map((g) => ({
  slug: g.slug,
  featured: g.data.featured,
  rank: g.data.rank,
  addedAt: g.data.addedAt,
  categories: g.data.categories,
}));
const orderedSlugs = sortGames(sortable, { surface: 'category', category: category.id, pins: PINS })
  .map((g) => g.slug);
const bySlug = new Map(allGames.map((g) => [g.slug, g] as const));
const ordered = orderedSlugs.map((s) => bySlug.get(s)!).filter((g) => g !== undefined);

// Per spec: category pages noindex if < 6 games or no intro present.
// We always have an intro (required in categories.ts), so gate on count.
const shouldIndex = ordered.length >= 6;

const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const breadcrumbLd = buildBreadcrumbJsonLd([
  { name: 'Home', url: `${siteUrl}/` },
  { name: category.name, url: `${siteUrl}/categories/${category.id}/` },
]);
---
<BaseLayout
  title={`${category.name} games — Kloopik`}
  description={category.description}
  canonicalPath={`/categories/${category.id}/`}
  jsonLd={breadcrumbLd}
>
  {!shouldIndex && <meta name="robots" content="noindex,follow" slot="head" />}
  <div class="container">
    <Breadcrumbs items={[
      { name: 'Home', href: '/' },
      { name: category.name },
    ]} />
    <h1>{category.name} games</h1>
    <p class="category-intro">{category.description}</p>
    <CategoryFilter activeId={category.id} />
    {ordered.length > 0
      ? <GameGrid games={ordered} eagerCount={8} />
      : <p>No games in this category yet — check back soon.</p>
    }
  </div>
</BaseLayout>

<style>
  .category-intro {
    color: var(--color-muted);
    max-width: 50rem;
    margin-bottom: var(--space-6);
  }
</style>
```

Note: Astro doesn't officially expose a `slot="head"` for BaseLayout injection. We use a simpler approach — override via `ogType` or use an extra prop. To keep this clean, add a `noindex` prop to BaseLayout in the next substep.

- [ ] **Step 2: Add `noindex` prop to BaseLayout**

Edit `/Users/egalvans/Downloads/Head/Claude/portal/src/layouts/BaseLayout.astro`:

In the Props interface, add:

```astro
noindex?: boolean;
```

In the destructuring:

```astro
const { ..., noindex = false } = Astro.props;
```

Replace the existing `<meta name="robots" content="index,follow" />` line with:

```astro
<meta name="robots" content={noindex ? 'noindex,follow' : 'index,follow'} />
```

- [ ] **Step 3: Use the `noindex` prop in the category page**

Edit `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/categories/[category].astro` — remove the broken `<meta slot="head">` line and pass `noindex` to BaseLayout:

```astro
<BaseLayout
  title={`${category.name} games — Kloopik`}
  description={category.description}
  canonicalPath={`/categories/${category.id}/`}
  jsonLd={breadcrumbLd}
  noindex={!shouldIndex}
>
```

And delete the line `{!shouldIndex && <meta name="robots" content="noindex,follow" slot="head" />}` from inside the layout.

- [ ] **Step 4: Verify build**

```bash
npm run build
ls dist/categories/
```

Expected: subdirectories for each category in `CATEGORIES`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/categories/ src/layouts/BaseLayout.astro
git commit -m "feat: /categories/[category]/ pages with conditional noindex"
```

---

## Task 23: /blog/ and /blog/[slug]/

**Files:**
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[slug].astro`

- [ ] **Step 1: Create the blog index**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/blog/index.astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import { getAllBlog } from '../../lib/games';
import { buildBreadcrumbJsonLd } from '../../lib/seo';

const posts = (await getAllBlog()).sort(
  (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
);

const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const breadcrumbLd = buildBreadcrumbJsonLd([
  { name: 'Home', url: `${siteUrl}/` },
  { name: 'Blog', url: `${siteUrl}/blog/` },
]);
---
<BaseLayout
  title="Blog — Kloopik"
  description="Writing about browser games, curation, and what's worth playing."
  canonicalPath="/blog/"
  jsonLd={breadcrumbLd}
>
  <div class="container">
    <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Blog' }]} />
    <h1>Blog</h1>
    {posts.length === 0 ? (
      <p>No posts yet. Check back soon.</p>
    ) : (
      <ul class="post-list" role="list">
        {posts.map((post) => (
          <li class="post-list__item">
            <a href={`/blog/${post.slug}/`}>
              <h2>{post.data.title}</h2>
            </a>
            <p class="post-list__meta">
              <time datetime={post.data.publishedAt.toISOString()}>
                {post.data.publishedAt.toISOString().slice(0, 10)}
              </time>
            </p>
            <p>{post.data.description}</p>
          </li>
        ))}
      </ul>
    )}
  </div>
</BaseLayout>

<style>
  .post-list { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-8); }
  .post-list__item h2 { font-size: var(--fs-xl); margin: 0 0 var(--space-2); }
  .post-list__meta { color: var(--color-muted); font-size: var(--fs-sm); margin: 0 0 var(--space-2); }
  .post-list a:hover, .post-list a:focus { text-decoration: none; }
</style>
```

- [ ] **Step 2: Create the post detail**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/blog/[slug].astro`:

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Breadcrumbs from '../../components/Breadcrumbs.astro';
import GameGrid from '../../components/GameGrid.astro';
import { getAllBlog, getGamesBySlugs, assertSlugsResolve } from '../../lib/games';
import { buildArticleJsonLd, buildBreadcrumbJsonLd } from '../../lib/seo';

export async function getStaticPaths() {
  const posts = await getAllBlog();
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await post.render();

// Integrity: referenced game slugs must resolve.
await assertSlugsResolve(post.data.relatedGames, `blog/${post.slug}.relatedGames`);
const relatedGames = await getGamesBySlugs(post.data.relatedGames);

const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const pagePath = `/blog/${post.slug}/`;
const canonical = `${siteUrl}${pagePath}`;

const articleLd = buildArticleJsonLd({
  headline: post.data.title,
  description: post.data.description,
  url: canonical,
  datePublished: post.data.publishedAt.toISOString(),
  dateModified: post.data.updatedAt?.toISOString() ?? post.data.publishedAt.toISOString(),
  image: post.data.hero ? `${siteUrl}${post.data.hero.src}` : undefined,
});

const breadcrumbLd = buildBreadcrumbJsonLd([
  { name: 'Home', url: `${siteUrl}/` },
  { name: 'Blog', url: `${siteUrl}/blog/` },
  { name: post.data.title, url: canonical },
]);
---
<BaseLayout
  title={`${post.data.title} — Kloopik`}
  description={post.data.description}
  canonicalPath={pagePath}
  ogType="article"
  ogImage={post.data.hero?.src}
  jsonLd={[articleLd, breadcrumbLd]}
>
  <article class="container blog-post">
    <Breadcrumbs items={[
      { name: 'Home', href: '/' },
      { name: 'Blog', href: '/blog/' },
      { name: post.data.title },
    ]} />
    <h1>{post.data.title}</h1>
    <p class="blog-post__meta">
      <time datetime={post.data.publishedAt.toISOString()}>
        {post.data.publishedAt.toISOString().slice(0, 10)}
      </time>
    </p>
    <div class="blog-post__body">
      <Content />
    </div>
    {relatedGames.length > 0 && (
      <section class="section-spacing">
        <h2>Games mentioned in this post</h2>
        <GameGrid games={relatedGames} eagerCount={0} />
      </section>
    )}
  </article>
</BaseLayout>

<style>
  .blog-post { max-width: 44rem; }
  .blog-post__meta { color: var(--color-muted); font-size: var(--fs-sm); }
  .blog-post__body :global(h2) { margin-top: var(--space-8); }
  .blog-post__body :global(p) { font-size: var(--fs-lg); line-height: 1.6; }
  .section-spacing { margin-top: var(--space-10); }
</style>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
ls dist/blog/
```

Expected: `dist/blog/index.html` + one directory per blog post.

- [ ] **Step 4: Commit**

```bash
git add src/pages/blog/
git commit -m "feat: /blog/ index and [slug] detail with article json-ld"
```

---

## Task 24: Static pages (about, privacy, terms)

**Files:**
- Create: `src/pages/about.astro`
- Create: `src/pages/privacy.astro`
- Create: `src/pages/terms.astro`

These are pragmatic placeholders — the legal copy can be iterated on. What matters is that they exist and are linked.

- [ ] **Step 1: Create `src/pages/about.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/about.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="About — Kloopik"
  description="Kloopik is a hand-curated collection of free browser games."
  canonicalPath="/about/"
>
  <article class="container static-page">
    <h1>About Kloopik</h1>
    <p>
      Kloopik is a hand-curated collection of free browser games. Every game listed
      here has been played by a human and picked because it's worth your time.
    </p>
    <p>
      We don't publish everything that exists — we publish what we'd recommend to a friend.
    </p>
    <h2>How it works</h2>
    <p>
      Games are hosted by their original publishers and embedded on Kloopik. We add
      an editorial review for each, and we organize them into categories and collections.
    </p>
    <h2>Contact</h2>
    <p>Questions or suggestions? Email <a href="mailto:hello@kloopik.com">hello@kloopik.com</a>.</p>
  </article>
</BaseLayout>

<style>
  .static-page { max-width: 44rem; }
  .static-page h2 { margin-top: var(--space-8); }
</style>
```

- [ ] **Step 2: Create `src/pages/privacy.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/privacy.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
const lastUpdated = '2026-04-21';
---
<BaseLayout
  title="Privacy — Kloopik"
  description="How Kloopik handles analytics and third-party game embeds."
  canonicalPath="/privacy/"
>
  <article class="container static-page">
    <h1>Privacy</h1>
    <p><strong>Last updated:</strong> {lastUpdated}</p>

    <h2>What we collect</h2>
    <p>
      We use <strong>Cloudflare Web Analytics</strong> to count page views. It is cookieless,
      does not identify visitors, and runs without your consent.
    </p>
    <p>
      If you accept the consent banner, we also load <strong>Google Analytics</strong> via
      Google Tag Manager. Google Analytics uses cookies to measure which pages are visited
      and how users interact with them. We use this to improve the site.
    </p>

    <h2>Third-party games</h2>
    <p>
      Games on Kloopik are embedded from third-party providers (currently GameMonetize).
      When you press "Play", an iframe from the provider loads. The provider may set their
      own cookies for ad personalization and to keep the game running. We do not control
      these cookies.
    </p>

    <h2>Your choices</h2>
    <p>
      You can accept or reject analytics/ads at any time via the consent banner. Clearing your
      browser data resets your choice. We don't operate user accounts, so there's nothing
      personal to delete.
    </p>

    <h2>Contact</h2>
    <p>Privacy questions: <a href="mailto:privacy@kloopik.com">privacy@kloopik.com</a>.</p>
  </article>
</BaseLayout>

<style>
  .static-page { max-width: 44rem; }
  .static-page h2 { margin-top: var(--space-8); }
</style>
```

- [ ] **Step 3: Create `src/pages/terms.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/terms.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
const lastUpdated = '2026-04-21';
---
<BaseLayout
  title="Terms — Kloopik"
  description="Terms of use for Kloopik."
  canonicalPath="/terms/"
>
  <article class="container static-page">
    <h1>Terms of use</h1>
    <p><strong>Last updated:</strong> {lastUpdated}</p>

    <h2>What Kloopik is</h2>
    <p>Kloopik is a directory of browser games hosted by third parties. We provide the catalog and commentary; the games themselves belong to their respective owners.</p>

    <h2>No warranty</h2>
    <p>Games are provided "as is" by their publishers. We don't guarantee availability, performance, or fitness for any particular purpose.</p>

    <h2>Content</h2>
    <p>Reviews and editorial content on Kloopik are ours. Please don't republish in bulk without permission.</p>

    <h2>Contact</h2>
    <p>Legal questions: <a href="mailto:legal@kloopik.com">legal@kloopik.com</a>.</p>
  </article>
</BaseLayout>

<style>
  .static-page { max-width: 44rem; }
  .static-page h2 { margin-top: var(--space-8); }
</style>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
ls dist/about dist/privacy dist/terms
```

Expected: all three directories with `index.html`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/about.astro src/pages/privacy.astro src/pages/terms.astro
git commit -m "feat: about, privacy, and terms pages"
```

---

## Task 25: RSS feed for blog

**Files:**
- Create: `src/pages/rss.xml.ts`
- Modify: `src/components/Footer.astro` (link is already there — verify)

`@astrojs/rss` provides the helper.

- [ ] **Step 1: Create the RSS endpoint**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/rss.xml.ts`:

```ts
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllBlog } from '../lib/games';

export async function GET(context: APIContext) {
  const posts = (await getAllBlog()).sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
  return rss({
    title: 'Kloopik — Blog',
    description: 'Writing about browser games, curation, and what\'s worth playing.',
    site: context.site!.toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      pubDate: post.data.publishedAt,
    })),
  });
}
```

- [ ] **Step 2: Verify the feed**

```bash
npm run build
cat dist/rss.xml | head -20
```

Expected: valid XML with `<channel><title>Kloopik — Blog</title>...<item>` structure.

Note: the footer link in Task 14 says `/feed.xml`. Astro emits this file as `/rss.xml`. Update the footer link:

- [ ] **Step 3: Fix the footer link**

Edit `/Users/egalvans/Downloads/Head/Claude/portal/src/components/Footer.astro` — change `<a href="/feed.xml">RSS</a>` to `<a href="/rss.xml">RSS</a>`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/rss.xml.ts src/components/Footer.astro
git commit -m "feat: RSS feed for blog posts at /rss.xml"
```

---

## Task 26: llms.txt endpoint

**Files:**
- Create: `src/pages/llms.txt.ts`

The `llms.txt` format is a plain-text file that gives LLM-powered crawlers a curated view of the site's best content. Kloopik version: brand sentence, link to top games, link to top blog posts, category index.

- [ ] **Step 1: Create the endpoint**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/llms.txt.ts`:

```ts
import type { APIContext } from 'astro';
import { getAllGames, getAllBlog } from '../lib/games';
import { sortGames } from '../lib/sort';
import { PINS } from '../data/featured';
import { CATEGORIES } from '../data/categories';

export async function GET(context: APIContext) {
  const site = context.site!.toString().replace(/\/$/, '');

  const games = await getAllGames();
  const sortable = games.map((g) => ({
    slug: g.slug,
    featured: g.data.featured,
    rank: g.data.rank,
    addedAt: g.data.addedAt,
    categories: g.data.categories,
  }));
  const topGames = sortGames(sortable, { surface: 'home-featured', pins: PINS }).slice(0, 20);
  const gameBySlug = new Map(games.map((g) => [g.slug, g] as const));

  const posts = (await getAllBlog())
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime())
    .slice(0, 20);

  const lines: string[] = [];
  lines.push('# Kloopik');
  lines.push('');
  lines.push('> Kloopik is a hand-curated directory of free browser games with original editorial reviews. Every listing is human-reviewed. No installs, no accounts.');
  lines.push('');
  lines.push('## Categories');
  for (const c of CATEGORIES) {
    lines.push(`- [${c.name}](${site}/categories/${c.id}/): ${c.description}`);
  }
  lines.push('');
  lines.push('## Top games');
  for (const s of topGames) {
    const g = gameBySlug.get(s.slug);
    if (!g) continue;
    lines.push(`- [${g.data.title}](${site}/games/${g.slug}/): ${g.data.categories.join(', ')}`);
  }
  lines.push('');
  lines.push('## Recent blog posts');
  for (const p of posts) {
    lines.push(`- [${p.data.title}](${site}/blog/${p.slug}/): ${p.data.description}`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

- [ ] **Step 2: Verify the output**

```bash
npm run build
cat dist/llms.txt
```

Expected: plain-text content with `# Kloopik` header and the sections populated.

- [ ] **Step 3: Commit**

```bash
git add src/pages/llms.txt.ts
git commit -m "feat: llms.txt endpoint for AI-search discoverability"
```

---

## Task 27: robots.txt update + verify sitemap

**Files:**
- Modify: `public/robots.txt`

Confirm the sitemap URL path matches what `@astrojs/sitemap` emits.

- [ ] **Step 1: Verify sitemap output**

```bash
npm run build
ls dist/sitemap-*.xml
```

Expected: `sitemap-index.xml` and `sitemap-0.xml` present.

- [ ] **Step 2: Update `public/robots.txt`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://www.kloopik.com/sitemap-index.xml
```

- [ ] **Step 3: Verify**

```bash
npm run build
cat dist/robots.txt
```

Expected: the content above.

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt
git commit -m "chore: robots.txt with sitemap reference and admin disallow"
```

---

## Task 28: Expanded tests + final build + checks

**Files:** none (verification only)

- [ ] **Step 1: Run all tests**

```bash
npm run test
```

Expected: all pass. Count should include smoke (1) + consent (12) + storage (10) + sort (6) + seo (11) + providers (11) = 51 tests.

- [ ] **Step 2: Run astro check**

```bash
npm run check
```

Expected: `0 errors, 0 warnings`. Fix any TS issues inline.

- [ ] **Step 3: Full production build**

```bash
rm -rf dist
npm run build
```

Expected: clean build. Check output structure:

```bash
find dist -type d | sort
```

Expected: directories for each route. `dist/games/<slug>/`, `dist/categories/<id>/`, `dist/blog/<slug>/`.

- [ ] **Step 4: Check JSON-LD on a game page**

```bash
grep -c "VideoGame" dist/games/<slug>/index.html
grep -c "BreadcrumbList" dist/games/<slug>/index.html
```

Expected: `1` each.

- [ ] **Step 5: Preview in browser**

```bash
npm run preview
```

Visit in sequence, verify each renders and looks right:
- `/`
- `/games/`
- `/games/<slug>/`
- `/categories/puzzle/`
- `/blog/`
- `/blog/<slug>/`
- `/about/`, `/privacy/`, `/terms/`
- `/rss.xml`
- `/llms.txt`
- `/sitemap-index.xml`

Stop with Ctrl+C.

- [ ] **Step 6: Commit any fixes**

If anything in Step 1–5 required fixes, commit them.

---

## Task 29: Push to production

**Files:** none

⚠️ **Confirm with user before pushing.**

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Verify on production**

Wait for CF Pages deployment. Visit `https://www.kloopik.com/` and verify:
- Home page renders with seed games
- `/games/<slug>/` page renders a playable game after clicking Play
- `/categories/puzzle/` (or whichever category) renders
- `/blog/` shows the seed post
- `/rss.xml` validates at https://validator.w3.org/feed/
- `/sitemap-index.xml` lists all game/blog/static URLs

- [ ] **Step 3: Submit sitemap to GSC**

(Optional for this plan — can wait until Plan 3.)

---

## Plan 2 exit criteria

- All routes in the spec's routes table emit HTML (`/`, `/games/`, `/games/[slug]`, `/categories/[category]`, `/blog/`, `/blog/[slug]`, `/about`, `/privacy`, `/terms`, `/404`).
- 5 seed games + 1 seed blog post render with correct SEO metadata (title, description, canonical, OG, JSON-LD).
- `sitemap-index.xml`, `rss.xml`, `llms.txt`, `robots.txt` all emitted and valid.
- 51 unit tests passing.
- `npm run check` clean.
- Build under 90s locally.
- Production site live at `https://www.kloopik.com` with real content.

Plan 3 (Polish & Launch) picks up from here to add favorites, search, ingest script, CI/CD, and the bulk launch.
