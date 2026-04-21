# Kloopik — Plan 3: Polish & Launch (Phases 4–5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Kloopik to production with the full feature set: favorites, client-side search, generated per-page OG images, an automated GameMonetize ingest CLI, CI that enforces type/lint/perf/content gates, analytics and Search Console verification, and a real seeded catalog of 50 games plus the first editorial blog post.

**Architecture:** Layer interactive islands (`FavoriteButton`, `SearchBox`) on top of the static site from Plan 2 — each under 10KB of gzipped JS, each built on the existing `storage.ts` + `seo.ts` primitives. A build-time script generates 1200×630 OG PNGs from Satori templates using the game thumbnail as a background. A Node CLI (`scripts/ingest-gamemonetize.ts`) reads the adapter's `normalizeFeed()` output, writes `draft: true` markdown files, and downloads thumbnails to `public/thumbnails/gamemonetize/`. Three GitHub Actions workflows enforce CI (typecheck/lint/build), Lighthouse budgets on PR preview URLs, and content schema + link integrity on content PRs.

**Tech Stack:** Astro 5, TypeScript strict, Vitest, `fuse.js` (client-side search), `satori` + `@resvg/resvg-js` (OG generation), `commander` (CLI args), GitHub Actions, Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-04-21-kloopik-games-portal-design.md`

**Entry state:** Plan 2 complete. Production site has 5 seed games, 1 blog post, full routing, SEO metadata, sitemap/RSS/llms.txt/robots.txt, 51 unit tests passing.

**Exit state:**
- 50 real (human-reviewed) games and 1 additional real blog post in production.
- Favorites, search, OG images all shipping.
- Ingest CLI operable: `npm run ingest:gamemonetize -- --limit 20` produces draft markdown.
- CI green on every PR: typecheck, lint, build, Lighthouse budgets, content schema.
- GSC verified, sitemap submitted, GA4 firing through GTM with consent gating, CF Web Analytics reporting.
- Test suite: ~68 unit tests passing.

**Out of scope for this plan:**
- Hand-written review bodies for any individual game beyond the 5 from Plan 2 (batches ship as `draft: true` — the human review happens between ingest and merge, but the plan treats each batch's review as an editorial task, not a step).
- Decap CMS, accounts, server-side persistence.
- Multi-language support.
- Any provider other than GameMonetize.
- AdSense / affiliate monetization.

---

## File inventory for this plan

**Created:**
- `src/lib/favorites.ts` — thin wrapper over `storage.ts` for the `kloopik.favorites.v1` key
- `tests/unit/favorites.test.ts`
- `src/components/FavoriteButton.astro` — island
- `src/pages/favorites.astro` — "your favorites" page (hydrates client-side)
- `src/lib/search-index.ts` — pure index-builder (`buildSearchIndex(games)`)
- `tests/unit/search-index.test.ts`
- `src/pages/search-index.json.ts` — endpoint emitting built index
- `src/components/SearchBox.astro` — island (loaded on demand)
- `src/pages/search.astro` — results page
- `src/lib/og.ts` — `renderOgImage({ title, thumbnail })` returning PNG `Buffer`
- `tests/unit/og.test.ts`
- `scripts/_assets/InterDisplay-Regular.otf` — font for Satori (downloaded once, committed)
- `scripts/build-og-images.mjs` — pre-build hook that writes `public/og/games/<slug>.png` and `public/og/blog/<slug>.png`
- `src/lib/ingest.ts` — pure core for the ingest CLI (`filenameFor`, `serializeFrontmatter`, `dedupeAgainstExisting`)
- `tests/unit/ingest.test.ts`
- `scripts/ingest-gamemonetize.ts` — CLI entry
- `scripts/new-post.ts` — blog-post scaffold CLI
- `scripts/check-links.ts` — internal-link validator used by `content-check.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/lighthouse.yml`
- `.github/workflows/content-check.yml`
- `lighthouserc.cjs`
- `docs/runbooks/dns-and-domain.md`
- `docs/runbooks/gsc-and-analytics.md`
- `docs/runbooks/launch-checklist.md`
- `src/content/blog/2026-05-08-best-free-puzzle-games-browser-2026.md` — second editorial blog post (first was seeded in Plan 2)
- `src/content/games/*.md` — 45 additional ingested + human-reviewed games (flat in the games collection, alongside the 5 seeds from Plan 2)
- `public/thumbnails/gamemonetize/*.webp` — 50 thumbnails (nested by provider per spec)

**Modified:**
- `package.json` — add `fuse.js`, `satori`, `@resvg/resvg-js`, `commander`, `tsx`, `@lhci/cli`; add `ingest:gamemonetize`, `new:post`, `check:links`, `build:og`, `prebuild` scripts
- `.env.example` — confirm Plan 1's `PUBLIC_*` vars are present (no new vars added in this plan)
- `README.md` — Scripts, Environment, Launch sections
- `src/layouts/BaseLayout.astro` — prefer `/og/games/<slug>.png` / `/og/blog/<slug>.png` over the thumbnail for OG
- `src/pages/games/[slug].astro` — add `<FavoriteButton slug={...} />`
- `src/components/Header.astro` — add search trigger + favorites link
- `astro.config.mjs` — (no change expected; only a note if Fuse.js shipping via island needs `vite.optimizeDeps`)

**Deleted:**
- None.

---

## Task 1: Favorites module (TDD)

**Files:**
- Create: `src/lib/favorites.ts`
- Create: `tests/unit/favorites.test.ts`

The favorites module is a thin, named wrapper over `storage.ts` so call sites don't sprinkle raw keys everywhere and the max-size cap lives in one place.

- [ ] **Step 1: Write the failing test**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/favorites.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FAVORITES_KEY,
  FAVORITES_LIMIT,
  getFavorites,
  isFavorite,
  toggleFavorite,
  clearFavorites,
} from '../../src/lib/favorites';

describe('favorites', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('FAVORITES_KEY is namespaced + versioned', () => {
    expect(FAVORITES_KEY).toBe('kloopik.favorites.v1');
  });

  it('getFavorites returns [] when empty', () => {
    expect(getFavorites()).toEqual([]);
  });

  it('toggleFavorite adds a slug when absent, removes when present', () => {
    expect(toggleFavorite('slither-io')).toEqual({ added: true, total: 1 });
    expect(getFavorites()).toEqual(['slither-io']);
    expect(toggleFavorite('slither-io')).toEqual({ added: false, total: 0 });
    expect(getFavorites()).toEqual([]);
  });

  it('isFavorite reflects current state', () => {
    expect(isFavorite('2048')).toBe(false);
    toggleFavorite('2048');
    expect(isFavorite('2048')).toBe(true);
  });

  it('enforces FAVORITES_LIMIT by dropping oldest when full', () => {
    for (let i = 0; i < FAVORITES_LIMIT; i++) {
      toggleFavorite(`game-${i}`);
    }
    expect(getFavorites()).toHaveLength(FAVORITES_LIMIT);

    const before = getFavorites()[0];
    const result = toggleFavorite('overflow-game');
    expect(result.added).toBe(true);
    expect(result.total).toBe(FAVORITES_LIMIT);
    const after = getFavorites();
    expect(after).toHaveLength(FAVORITES_LIMIT);
    expect(after).not.toContain(before);
    expect(after[after.length - 1]).toBe('overflow-game');
  });

  it('clearFavorites empties the list', () => {
    toggleFavorite('a');
    toggleFavorite('b');
    clearFavorites();
    expect(getFavorites()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to fail**

```bash
npm run test
```

Expected: fails with `Cannot find module '../../src/lib/favorites'`.

- [ ] **Step 3: Implement `src/lib/favorites.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/favorites.ts`:

```ts
import { readList, writeList, isInList } from './storage';

export const FAVORITES_KEY = 'kloopik.favorites.v1';
export const FAVORITES_LIMIT = 200;

export function getFavorites(): string[] {
  return readList(FAVORITES_KEY);
}

export function isFavorite(slug: string): boolean {
  return isInList(FAVORITES_KEY, slug);
}

export interface ToggleResult {
  added: boolean;
  total: number;
}

export function toggleFavorite(slug: string): ToggleResult {
  const current = readList(FAVORITES_KEY);
  const idx = current.indexOf(slug);
  if (idx >= 0) {
    current.splice(idx, 1);
    writeList(FAVORITES_KEY, current);
    return { added: false, total: current.length };
  }
  current.push(slug);
  while (current.length > FAVORITES_LIMIT) {
    current.shift();
  }
  writeList(FAVORITES_KEY, current);
  return { added: true, total: current.length };
}

export function clearFavorites(): void {
  writeList(FAVORITES_KEY, []);
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: 6 new tests pass. Full suite: 57 passed (51 from Plan 2 + 6 here).

- [ ] **Step 5: Commit**

```bash
git add src/lib/favorites.ts tests/unit/favorites.test.ts
git commit -m "feat: favorites module backed by localStorage list helpers"
```

---

## Task 2: FavoriteButton island

**Files:**
- Create: `src/components/FavoriteButton.astro`
- Modify: `src/pages/games/[slug].astro`

A button that toggles the current game's favorite state. Client-only script (hydrates via `is:inline` + `client:load` pattern — we use a plain Astro component with a `<script>` tag, no framework).

- [ ] **Step 1: Create `src/components/FavoriteButton.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/FavoriteButton.astro`:

```astro
---
interface Props {
  slug: string;
  title: string;
}
const { slug, title } = Astro.props;
---

<button
  class="favorite-button"
  data-slug={slug}
  data-title={title}
  aria-pressed="false"
  type="button"
>
  <span class="favorite-icon" aria-hidden="true">☆</span>
  <span class="favorite-label">Save to favorites</span>
</button>

<style>
  .favorite-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.875rem;
    background: var(--color-surface-2);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    font: inherit;
    cursor: pointer;
    transition: background 120ms ease, border-color 120ms ease;
  }
  .favorite-button:hover {
    background: var(--color-surface-3);
    border-color: var(--color-accent);
  }
  .favorite-button[aria-pressed='true'] {
    background: var(--color-accent-soft);
    border-color: var(--color-accent);
    color: var(--color-accent-strong);
  }
  .favorite-button[aria-pressed='true'] .favorite-icon::before {
    content: '★';
  }
  .favorite-icon {
    font-size: 1.25em;
    line-height: 1;
  }
</style>

<script>
  import { isFavorite, toggleFavorite } from '../lib/favorites';

  const buttons = document.querySelectorAll<HTMLButtonElement>('.favorite-button');
  for (const btn of buttons) {
    const slug = btn.dataset.slug;
    if (!slug) continue;

    const sync = () => {
      const on = isFavorite(slug);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const label = btn.querySelector<HTMLSpanElement>('.favorite-label');
      const icon = btn.querySelector<HTMLSpanElement>('.favorite-icon');
      if (label) label.textContent = on ? 'In your favorites' : 'Save to favorites';
      if (icon) icon.textContent = on ? '★' : '☆';
    };

    sync();

    btn.addEventListener('click', () => {
      toggleFavorite(slug);
      sync();
    });
  }
</script>
```

- [ ] **Step 2: Mount the button on the game detail page**

Open `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/games/[slug].astro`. Add the import near the other component imports:

```astro
import FavoriteButton from '../../components/FavoriteButton.astro';
```

Render the button near the `GamePlayer` block (directly under the player on the detail page). Example insertion:

```astro
<GamePlayer embedUrl={data.embedUrl} title={data.title} thumbnail={data.thumbnail.src} />
<div class="game-actions">
  <FavoriteButton slug={entry.slug} title={data.title} />
</div>
```

Add matching CSS if you want spacing (a single `.game-actions { margin-top: 1rem; }` rule is enough).

- [ ] **Step 3: Manual smoke**

```bash
npm run dev
```

Open `http://localhost:4321/games/<any-seeded-slug>/`. Click the button — it should toggle "★ In your favorites". Reload — state persists. `localStorage.getItem('kloopik.favorites.v1')` in DevTools confirms the slug is stored.

- [ ] **Step 4: Stop dev server and commit**

```bash
git add src/components/FavoriteButton.astro src/pages/games/\[slug\].astro
git commit -m "feat: FavoriteButton island on game detail pages"
```

---

## Task 3: /favorites/ page

**Files:**
- Create: `src/pages/favorites.astro`
- Modify: `src/components/Header.astro` (add nav link)

Lists the user's favorited games client-side. The page is built with *all* published games in a hidden JSON blob; the client filters by the user's stored favorites. Avoids calling `getCollection` at runtime.

- [ ] **Step 1: Create `src/pages/favorites.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/favorites.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getAllGames } from '../lib/games';

const games = await getAllGames();
const catalog = games.map((g) => ({
  slug: g.slug,
  title: g.data.title,
  thumbnail: g.data.thumbnail.src,
  categories: g.data.categories,
}));
---

<BaseLayout
  title="Your favorites | Kloopik"
  description="The games you've saved on Kloopik. Stored locally in your browser — nothing synced, no account required."
  noindex={true}
>
  <section class="favorites">
    <h1>Your favorites</h1>
    <p class="favorites-empty" data-empty>You haven't saved any games yet. Browse the catalog and tap the ★ button on any game to save it here.</p>

    <ul class="favorites-grid" data-grid hidden>
      <!-- populated client-side -->
    </ul>

    <template id="favorite-card-template">
      <li class="favorite-card">
        <a class="favorite-card-link" href="">
          <img class="favorite-card-thumb" src="" alt="" width="512" height="384" loading="lazy" />
          <span class="favorite-card-title"></span>
        </a>
        <button type="button" class="favorite-card-remove" aria-label="Remove from favorites">×</button>
      </li>
    </template>
  </section>

  <script is:inline define:vars={{ catalog }}>
    window.__KLOOPIK_CATALOG__ = catalog;
  </script>

  <script>
    import { getFavorites, toggleFavorite } from '../lib/favorites';

    interface CatalogEntry {
      slug: string;
      title: string;
      thumbnail: string;
      categories: string[];
    }

    const catalog = ((window as unknown as { __KLOOPIK_CATALOG__: CatalogEntry[] }).__KLOOPIK_CATALOG__) ?? [];
    const bySlug = new Map(catalog.map((c) => [c.slug, c]));

    const grid = document.querySelector<HTMLElement>('[data-grid]');
    const empty = document.querySelector<HTMLElement>('[data-empty]');
    const tpl = document.querySelector<HTMLTemplateElement>('#favorite-card-template');
    if (!grid || !empty || !tpl) throw new Error('favorites page: missing DOM');

    function render() {
      grid!.innerHTML = '';
      const favs = getFavorites();
      const known = favs.map((s) => bySlug.get(s)).filter((c): c is CatalogEntry => c !== undefined);

      if (known.length === 0) {
        grid!.hidden = true;
        empty!.hidden = false;
        return;
      }
      empty!.hidden = true;
      grid!.hidden = false;

      for (const entry of known) {
        const node = tpl!.content.cloneNode(true) as DocumentFragment;
        const link = node.querySelector<HTMLAnchorElement>('.favorite-card-link')!;
        const img = node.querySelector<HTMLImageElement>('.favorite-card-thumb')!;
        const title = node.querySelector<HTMLSpanElement>('.favorite-card-title')!;
        const remove = node.querySelector<HTMLButtonElement>('.favorite-card-remove')!;
        link.href = `/games/${entry.slug}/`;
        img.src = entry.thumbnail;
        img.alt = entry.title;
        title.textContent = entry.title;
        remove.addEventListener('click', () => {
          toggleFavorite(entry.slug);
          render();
        });
        grid!.appendChild(node);
      }
    }

    render();
  </script>
</BaseLayout>

<style>
  .favorites { padding: 2rem 0 4rem; }
  .favorites-grid {
    list-style: none;
    padding: 0;
    margin: 2rem 0 0;
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
  .favorite-card {
    position: relative;
    background: var(--color-surface-2);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .favorite-card-link { display: block; color: inherit; text-decoration: none; }
  .favorite-card-thumb { width: 100%; height: auto; display: block; }
  .favorite-card-title { display: block; padding: 0.5rem 0.75rem; font-weight: 600; }
  .favorite-card-remove {
    position: absolute; top: 0.25rem; right: 0.25rem;
    width: 1.75rem; height: 1.75rem; border-radius: 50%;
    border: 0; background: rgba(0, 0, 0, 0.6); color: white;
    cursor: pointer; font-size: 1rem; line-height: 1;
  }
</style>
```

The page is `noindex` (it's per-visitor state — there's nothing to crawl).

- [ ] **Step 2: Add nav link in Header**

Open `/Users/egalvans/Downloads/Head/Claude/portal/src/components/Header.astro`. In the nav list, add:

```astro
<li><a href="/favorites/">Favorites</a></li>
```

Place it after the Categories link and before the Blog link.

- [ ] **Step 3: Manual smoke**

```bash
npm run dev
```

- Star 2–3 seed games on their detail pages.
- Navigate to `/favorites/` via the Header link — the saved games render in a grid.
- Click the × on a card — it disappears immediately and does not return on reload.
- Unstar all — the empty-state message reappears.

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: builds. `dist/favorites/index.html` exists and contains the catalog JSON in the inline script.

- [ ] **Step 5: Commit**

```bash
git add src/pages/favorites.astro src/components/Header.astro
git commit -m "feat: /favorites page rendering client-side from localStorage"
```

---

## Task 4: Search index builder (TDD)

**Files:**
- Create: `src/lib/search-index.ts`
- Create: `tests/unit/search-index.test.ts`

A pure builder that turns `GameEntry[]` into `SearchIndexEntry[]`. Shipping this as a function (not a page) means it's trivially unit-tested; the page-level endpoint in the next task just wraps it.

- [ ] **Step 1: Write the failing test**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/search-index.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildSearchIndex, type SearchIndexEntry } from '../../src/lib/search-index';

function fakeEntry(slug: string, overrides: Partial<SearchIndexEntry> = {}): unknown {
  return {
    slug,
    data: {
      title: overrides.title ?? slug,
      thumbnail: { src: overrides.thumbnail ?? `/thumb/${slug}.webp`, width: 512, height: 384 },
      categories: overrides.categories ?? ['puzzle'],
      tags: overrides.tags ?? ['fun'],
      draft: false,
    },
  };
}

describe('buildSearchIndex', () => {
  it('maps game entries to lean index entries', () => {
    const games = [fakeEntry('abc'), fakeEntry('def')] as Parameters<typeof buildSearchIndex>[0];
    const index = buildSearchIndex(games);
    expect(index).toHaveLength(2);
    const first = index[0];
    expect(first.slug).toBe('abc');
    expect(first.title).toBe('abc');
    expect(first.thumbnail).toBe('/thumb/abc.webp');
    expect(first.categories).toEqual(['puzzle']);
    expect(first.tags).toEqual(['fun']);
  });

  it('produces entries with stable ordering (alphabetical by slug)', () => {
    const games = [fakeEntry('zeta'), fakeEntry('alpha'), fakeEntry('mu')] as Parameters<typeof buildSearchIndex>[0];
    const index = buildSearchIndex(games);
    expect(index.map((e) => e.slug)).toEqual(['alpha', 'mu', 'zeta']);
  });

  it('omits fields not needed for search (keeps payload small)', () => {
    const games = [fakeEntry('abc')] as Parameters<typeof buildSearchIndex>[0];
    const index = buildSearchIndex(games);
    const entry = index[0] as unknown as Record<string, unknown>;
    expect(Object.keys(entry).sort()).toEqual(['categories', 'slug', 'tags', 'thumbnail', 'title']);
  });

  it('returns [] when given []', () => {
    expect(buildSearchIndex([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to fail**

```bash
npm run test
```

Expected: fails with `Cannot find module '../../src/lib/search-index'`.

- [ ] **Step 3: Implement `src/lib/search-index.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/search-index.ts`:

```ts
import type { GameEntry } from './games';

export interface SearchIndexEntry {
  slug: string;
  title: string;
  thumbnail: string;
  categories: string[];
  tags: string[];
}

export function buildSearchIndex(games: GameEntry[]): SearchIndexEntry[] {
  return games
    .map((g) => ({
      slug: g.slug,
      title: g.data.title,
      thumbnail: g.data.thumbnail.src,
      categories: [...g.data.categories],
      tags: [...g.data.tags],
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: 4 new tests pass. Full suite: 61 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search-index.ts tests/unit/search-index.test.ts
git commit -m "feat: search index builder with tests"
```

---

## Task 5: Search index endpoint, SearchBox island, /search/ page

**Files:**
- Create: `src/pages/search-index.json.ts`
- Create: `src/components/SearchBox.astro`
- Create: `src/pages/search.astro`
- Modify: `src/components/Header.astro`
- Modify: `package.json`

Using [Fuse.js](https://fusejs.io/) (~12KB gzipped) for fuzzy matching. The index is built once at build time and served as a static JSON file. The SearchBox island fetches it on first focus.

- [ ] **Step 1: Install Fuse.js**

```bash
cd /Users/egalvans/Downloads/Head/Claude/portal
npm install fuse.js
```

Expected: `fuse.js` added to `dependencies`.

- [ ] **Step 2: Emit the index as a static JSON endpoint**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/search-index.json.ts`:

```ts
import type { APIRoute } from 'astro';
import { getAllGames } from '../lib/games';
import { buildSearchIndex } from '../lib/search-index';

export const GET: APIRoute = async () => {
  const games = await getAllGames();
  const index = buildSearchIndex(games);
  return new Response(JSON.stringify(index), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
```

- [ ] **Step 3: Create the SearchBox island**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/SearchBox.astro`:

```astro
---
interface Props {
  placeholder?: string;
}
const { placeholder = 'Search games...' } = Astro.props;
---

<div class="search-box" data-search>
  <input
    type="search"
    class="search-input"
    placeholder={placeholder}
    aria-label="Search games"
    autocomplete="off"
  />
  <ul class="search-results" role="listbox" hidden></ul>
</div>

<style>
  .search-box { position: relative; width: 100%; max-width: 420px; }
  .search-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font: inherit;
    color: var(--color-text);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }
  .search-input:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
  .search-results {
    position: absolute;
    top: calc(100% + 4px);
    left: 0; right: 0;
    list-style: none;
    margin: 0;
    padding: 0.25rem 0;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    max-height: 420px;
    overflow-y: auto;
    z-index: 10;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }
  .search-results li { margin: 0; }
  .search-results a {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0.75rem;
    color: inherit;
    text-decoration: none;
  }
  .search-results a:hover,
  .search-results a:focus {
    background: var(--color-surface-2);
  }
  .search-results img { width: 48px; height: 36px; object-fit: cover; border-radius: 3px; }
</style>

<script>
  import Fuse from 'fuse.js';

  interface Entry {
    slug: string;
    title: string;
    thumbnail: string;
    categories: string[];
    tags: string[];
  }

  const FUSE_OPTS = {
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'tags', weight: 0.2 },
      { name: 'categories', weight: 0.1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  } as const;

  const MAX_RESULTS = 8;

  let fuse: Fuse<Entry> | null = null;
  let indexLoading: Promise<void> | null = null;

  function loadIndex(): Promise<void> {
    if (fuse) return Promise.resolve();
    if (indexLoading) return indexLoading;
    indexLoading = fetch('/search-index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`search-index.json: ${res.status}`);
        return res.json() as Promise<Entry[]>;
      })
      .then((data) => {
        fuse = new Fuse(data, FUSE_OPTS);
      })
      .catch((err) => {
        console.error('[search] failed to load index', err);
        indexLoading = null;
      });
    return indexLoading;
  }

  function initBox(container: HTMLElement) {
    const input = container.querySelector<HTMLInputElement>('.search-input');
    const list = container.querySelector<HTMLUListElement>('.search-results');
    if (!input || !list) return;

    const render = (query: string) => {
      if (!fuse || query.trim().length < 2) {
        list.hidden = true;
        list.innerHTML = '';
        return;
      }
      const results = fuse.search(query).slice(0, MAX_RESULTS).map((r) => r.item);
      if (results.length === 0) {
        list.hidden = true;
        list.innerHTML = '';
        return;
      }
      list.innerHTML = results
        .map(
          (r) => `
            <li role="option">
              <a href="/games/${encodeURIComponent(r.slug)}/">
                <img src="${r.thumbnail}" alt="" width="48" height="36" loading="lazy" />
                <span>${r.title}</span>
              </a>
            </li>
          `,
        )
        .join('');
      list.hidden = false;
    };

    input.addEventListener('focus', () => {
      void loadIndex();
    });

    input.addEventListener('input', () => {
      void loadIndex().then(() => render(input.value));
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim().length >= 2) {
        const params = new URLSearchParams({ q: input.value.trim() });
        window.location.href = `/search/?${params.toString()}`;
      }
      if (e.key === 'Escape') {
        list.hidden = true;
      }
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target as Node)) list.hidden = true;
    });
  }

  document.querySelectorAll<HTMLElement>('[data-search]').forEach(initBox);
</script>
```

- [ ] **Step 4: Add SearchBox to Header**

Open `/Users/egalvans/Downloads/Head/Claude/portal/src/components/Header.astro`. At the top of `---`, import:

```astro
import SearchBox from './SearchBox.astro';
```

In the header markup, add a `<SearchBox />` element between the logo and the nav list (example structure — adapt to whatever markup Header already has):

```astro
<div class="header-search">
  <SearchBox />
</div>
```

Matching CSS for layout (single-line, responsive collapse on narrow screens). Aim for: logo on left, search centered/flex-grow, nav on right.

- [ ] **Step 5: Create the `/search/` results page**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/search.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout
  title="Search games | Kloopik"
  description="Search the Kloopik games catalog."
  noindex={true}
>
  <section class="search-page">
    <h1>Search</h1>
    <form data-search-form>
      <input
        type="search"
        name="q"
        class="search-page-input"
        placeholder="Search games..."
        aria-label="Search games"
        autocomplete="off"
      />
    </form>
    <p class="search-page-summary" data-summary></p>
    <ul class="search-page-results" data-results></ul>
  </section>

  <script>
    import Fuse from 'fuse.js';

    interface Entry {
      slug: string;
      title: string;
      thumbnail: string;
      categories: string[];
      tags: string[];
    }

    const input = document.querySelector<HTMLInputElement>('[data-search-form] input[name="q"]');
    const summary = document.querySelector<HTMLElement>('[data-summary]');
    const list = document.querySelector<HTMLUListElement>('[data-results]');
    if (!input || !summary || !list) throw new Error('search page: missing DOM');

    const params = new URLSearchParams(window.location.search);
    const initial = params.get('q') ?? '';
    input.value = initial;

    let fuse: Fuse<Entry> | null = null;

    async function ensureIndex() {
      if (fuse) return;
      const res = await fetch('/search-index.json');
      const data = (await res.json()) as Entry[];
      fuse = new Fuse(data, {
        keys: [
          { name: 'title', weight: 0.7 },
          { name: 'tags', weight: 0.2 },
          { name: 'categories', weight: 0.1 },
        ],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });
    }

    function render(q: string) {
      if (!fuse) return;
      const query = q.trim();
      if (query.length < 2) {
        summary.textContent = 'Type at least 2 characters to search.';
        list.innerHTML = '';
        return;
      }
      const results = fuse.search(query).map((r) => r.item);
      summary.textContent = `${results.length} result${results.length === 1 ? '' : 's'} for "${query}"`;
      list.innerHTML = results
        .map(
          (r) => `
            <li class="search-page-card">
              <a href="/games/${encodeURIComponent(r.slug)}/">
                <img src="${r.thumbnail}" alt="" width="240" height="180" loading="lazy" />
                <span>${r.title}</span>
              </a>
            </li>
          `,
        )
        .join('');
    }

    (async () => {
      await ensureIndex();
      render(initial);
    })();

    input.addEventListener('input', () => render(input.value));

    document.querySelector<HTMLFormElement>('[data-search-form]')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const params = new URLSearchParams({ q: input.value.trim() });
      window.history.replaceState({}, '', `/search/?${params.toString()}`);
      render(input.value);
    });
  </script>

  <style>
    .search-page { padding: 2rem 0 4rem; }
    .search-page-input {
      width: 100%;
      max-width: 520px;
      padding: 0.6rem 0.875rem;
      font-size: 1.1rem;
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      color: var(--color-text);
    }
    .search-page-summary { margin: 1.25rem 0 0.5rem; color: var(--color-text-muted); }
    .search-page-results {
      list-style: none; padding: 0; margin: 0;
      display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
    .search-page-card a {
      display: block; color: inherit; text-decoration: none;
      background: var(--color-surface-2); border-radius: var(--radius-md); overflow: hidden;
    }
    .search-page-card img { width: 100%; height: auto; display: block; }
    .search-page-card span { display: block; padding: 0.5rem 0.75rem; font-weight: 600; }
  </style>
</BaseLayout>
```

The page is `noindex` — it exists only to render user queries and shouldn't rank on its own.

- [ ] **Step 6: Manual smoke**

```bash
npm run dev
```

- Focus the header search input → no network request until focus, then one GET `/search-index.json`.
- Type a query matching a seed title → dropdown shows 1–3 results.
- Press Enter → navigates to `/search/?q=...` with results list rendered.
- Clear the input on `/search/` → summary updates to "Type at least 2 characters".

- [ ] **Step 7: Stop dev and verify build**

```bash
npm run build
```

Expected:
- `dist/search-index.json` exists and contains a sorted array of 5 entries.
- `dist/search/index.html` exists.
- Total JS per page (from Astro's build summary) remains under 50KB for the header's hydrated search.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json \
  src/lib/search-index.ts tests/unit/search-index.test.ts \
  src/pages/search-index.json.ts \
  src/components/SearchBox.astro src/pages/search.astro \
  src/components/Header.astro
git commit -m "feat: fuse.js-backed client search with header box and /search results page"
```

---

## Task 6: OG image renderer (TDD)

**Files:**
- Create: `scripts/_assets/InterDisplay-Regular.otf` (downloaded)
- Create: `src/lib/og.ts`
- Create: `tests/unit/og.test.ts`
- Modify: `package.json`

Satori (JSX → SVG) + Resvg (SVG → PNG) compose into a ~1s-per-image build-time pipeline. We write the renderer as a pure `async` function first, then hook it into a pre-build script in Task 7.

- [ ] **Step 1: Install Satori + Resvg**

```bash
cd /Users/egalvans/Downloads/Head/Claude/portal
npm install --save-dev satori @resvg/resvg-js
```

Expected: both in `devDependencies`.

- [ ] **Step 2: Fetch the font once**

```bash
mkdir -p /Users/egalvans/Downloads/Head/Claude/portal/scripts/_assets
curl -L --fail -o /Users/egalvans/Downloads/Head/Claude/portal/scripts/_assets/InterDisplay-Regular.otf \
  "https://github.com/rsms/inter/raw/v4.0/docs/font-files/InterDisplay-Regular.otf"
```

Expected: file exists, size >200KB. Commit to git (the licence is SIL OFL — redistribution allowed).

- [ ] **Step 3: Write the failing test**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/og.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderOgImage } from '../../src/lib/og';

describe('renderOgImage', () => {
  it('returns a PNG buffer of the expected dimensions', async () => {
    const png = await renderOgImage({
      title: 'Test Game',
      subtitle: 'Puzzle',
    });
    // PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
    expect(png.slice(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    // IHDR width/height live at bytes 16-23 (big-endian). Sanity-check width is 1200.
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    expect(width).toBe(1200);
    expect(height).toBe(630);
  }, 15_000);

  it('handles long titles without throwing', async () => {
    const title = 'A Very Long Game Title That Should Still Render Because We Truncate Or Wrap';
    const png = await renderOgImage({ title, subtitle: 'Puzzle' });
    expect(png.length).toBeGreaterThan(1000);
  }, 15_000);
});
```

- [ ] **Step 4: Run to fail**

```bash
npm run test
```

Expected: fails with `Cannot find module '../../src/lib/og'`.

- [ ] **Step 5: Implement `src/lib/og.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/og.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const FONT_PATH = resolve(process.cwd(), 'scripts/_assets/InterDisplay-Regular.otf');
const FONT_DATA = readFileSync(FONT_PATH);

export interface OgInput {
  title: string;
  subtitle?: string;
}

export async function renderOgImage(input: OgInput): Promise<Buffer> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f8fafc',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { fontSize: 36, fontWeight: 500, letterSpacing: '0.02em', color: '#38bdf8' },
              children: 'KLOOPIK',
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: 16 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 72,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      maxWidth: 1072,
                    },
                    children: input.title,
                  },
                },
                input.subtitle
                  ? {
                      type: 'div',
                      props: {
                        style: { fontSize: 32, color: '#94a3b8' },
                        children: input.subtitle,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: 28, color: '#94a3b8' },
              children: 'Play free browser games at kloopik.com',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: FONT_DATA,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  );

  const resvg = new Resvg(svg, { background: '#0f172a' });
  return resvg.render().asPng();
}
```

- [ ] **Step 6: Run tests**

```bash
npm run test
```

Expected: 2 new tests pass. Full suite: 63 passed.

If Satori complains about the font not registering, double-check the OTF downloaded correctly (file must be >200KB and open cleanly in macOS Font Book).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/_assets/InterDisplay-Regular.otf \
  src/lib/og.ts tests/unit/og.test.ts
git commit -m "feat: OG image renderer using satori + resvg with tests"
```

---

## Task 7: Pre-build OG generation script

**Files:**
- Create: `scripts/build-og-images.mjs`
- Modify: `package.json`
- Modify: `src/layouts/BaseLayout.astro`

Runs before every production build. Writes one 1200×630 PNG per game (`public/og/games/<slug>.png`) and per blog post (`public/og/blog/<slug>.png`). Images are not committed to git — `.gitignore` them and let CI regenerate.

- [ ] **Step 1: Add `.gitignore` entry for generated OGs**

Append to `/Users/egalvans/Downloads/Head/Claude/portal/.gitignore`:

```
# Generated OG images (rebuilt by scripts/build-og-images.mjs)
/public/og/games/
/public/og/blog/
```

Keep `/public/og/default.png` committed (that file was seeded in Plan 2).

- [ ] **Step 2: Write the pre-build script**

Write `/Users/egalvans/Downloads/Head/Claude/portal/scripts/build-og-images.mjs`:

```js
// Pre-build hook: generate 1200x630 OG PNGs for every game and blog post.
// Run via `npm run build:og` or implicitly before `npm run build` (see package.json prebuild).
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { renderOgImage } from '../src/lib/og.ts';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const GAMES_DIR = join(ROOT, 'src/content/games');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT_GAMES = join(ROOT, 'public/og/games');
const OUT_BLOG = join(ROOT, 'public/og/blog');

async function walkMarkdown(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkMarkdown(full)));
    else if (e.name.endsWith('.md') || e.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function generate({ files, outDir, subtitleFor, slugFor }) {
  await ensureDir(outDir);
  let count = 0;
  for (const file of files) {
    const raw = await readFile(file, 'utf-8');
    const { data } = matter(raw);
    if (data.draft === true && process.env.NODE_ENV === 'production') continue;
    const slug = slugFor(file, data);
    const png = await renderOgImage({
      title: data.title ?? slug,
      subtitle: subtitleFor(data),
    });
    await writeFile(join(outDir, `${slug}.png`), png);
    count++;
  }
  return count;
}

function slugFromPath(file) {
  return file.split('/').pop().replace(/\.mdx?$/, '');
}

const gameFiles = await walkMarkdown(GAMES_DIR);
const blogFiles = await walkMarkdown(BLOG_DIR);

const gameCount = await generate({
  files: gameFiles,
  outDir: OUT_GAMES,
  slugFor: (file) => slugFromPath(file),
  subtitleFor: (data) =>
    Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories[0][0].toUpperCase() + data.categories[0].slice(1)
      : 'Play free',
});

const blogCount = await generate({
  files: blogFiles,
  outDir: OUT_BLOG,
  slugFor: (file) => slugFromPath(file),
  subtitleFor: () => 'Blog',
});

console.log(`[og] wrote ${gameCount} game + ${blogCount} blog OG images`);
```

- [ ] **Step 3: Install `gray-matter` (used above)**

```bash
npm install --save-dev gray-matter tsx
```

`tsx` is needed so the `.mjs` script can import `.ts` modules without a compile step.

- [ ] **Step 4: Add `build:og` and `prebuild` scripts**

Open `/Users/egalvans/Downloads/Head/Claude/portal/package.json`. In `"scripts"`, add:

```json
"build:og": "tsx scripts/build-og-images.mjs",
"prebuild": "npm run build:og"
```

Full `scripts` block should now look like (order of existing keys preserved):

```json
{
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run",
    "test:watch": "vitest",
    "build:og": "tsx scripts/build-og-images.mjs",
    "prebuild": "npm run build:og"
  }
}
```

(Plan 1 established `test`, `dev`, `build`, etc. — only add the new entries and leave the rest alone.)

- [ ] **Step 5: Update `BaseLayout.astro` to prefer generated OG**

Open `/Users/egalvans/Downloads/Head/Claude/portal/src/layouts/BaseLayout.astro`. Find the `ogImage` prop handling block from Plan 2 Task 15. Wrap or replace the image-selection logic with a helper that prefers generated OGs:

```astro
---
interface Props {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  slug?: string;     // if provided, auto-picks /og/games/<slug>.png
  collection?: 'games' | 'blog';
}
const { slug, collection, ogImage: ogImageProp } = Astro.props;

const resolvedOg =
  ogImageProp
    ?? (slug && collection ? `/og/${collection}/${slug}.png` : '/og/default.png');
---
```

Use `resolvedOg` wherever the OG meta tags are emitted. The game detail page and blog post page pass `{ slug, collection }` so the generated image is picked automatically.

- [ ] **Step 6: Pass `{ slug, collection }` from game + blog pages**

In `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/games/[slug].astro`, update the `BaseLayout` usage:

```astro
<BaseLayout
  title={buildGameTitle(data.title)}
  description={buildGameDescription(body)}
  slug={entry.slug}
  collection="games"
  ogType="website"
>
```

In `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/blog/[slug].astro`, similarly:

```astro
<BaseLayout
  title={`${data.title} | Kloopik`}
  description={data.description}
  slug={entry.slug}
  collection="blog"
  ogType="article"
>
```

- [ ] **Step 7: Verify pre-build runs**

```bash
npm run build
```

Expected:
- Console shows `[og] wrote 5 game + 1 blog OG images` (the 5 seeds + 1 blog post from Plan 2).
- `public/og/games/*.png` and `public/og/blog/*.png` exist.
- `dist/og/games/*.png` exists in the build output.
- `dist/games/<slug>/index.html` references `/og/games/<slug>.png` in `og:image`.

- [ ] **Step 8: Commit**

```bash
git add .gitignore package.json package-lock.json scripts/build-og-images.mjs \
  src/layouts/BaseLayout.astro src/pages/games/\[slug\].astro src/pages/blog/\[slug\].astro
git commit -m "feat: pre-build OG image generation wired into BaseLayout"
```

---

## Task 8: GameMonetize ingest CLI — pure core (TDD)

**Files:**
- Create: `src/lib/ingest.ts`
- Create: `tests/unit/ingest.test.ts`

The CLI is a thin I/O shell around these pure functions. Test the logic without touching the network or filesystem.

- [ ] **Step 1: Write the failing test**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/ingest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  filenameFor,
  serializeFrontmatter,
  dedupeAgainstExisting,
} from '../../src/lib/ingest';
import type { NormalizedGame } from '../../src/lib/providers/types';

function sampleGame(overrides: Partial<NormalizedGame> = {}): NormalizedGame {
  return {
    slug: 'test-puzzle',
    title: 'Test Puzzle',
    provider: 'gamemonetize',
    providerId: 'abc123',
    embedUrl: 'https://html5.gamemonetize.co/abc123/',
    thumbnail: { src: 'https://img.example.com/abc.jpg', width: 512, height: 384 },
    categories: ['puzzle'],
    tags: ['logic'],
    controls: ['mouse'],
    orientation: 'landscape',
    description: 'A test puzzle.',
    ...overrides,
  };
}

describe('filenameFor', () => {
  it('returns a flat path under src/content/games/ so Astro slugs stay flat', () => {
    expect(filenameFor(sampleGame())).toBe('src/content/games/test-puzzle.md');
  });
});

describe('serializeFrontmatter', () => {
  it('produces a parseable YAML frontmatter + draft body', () => {
    const g = sampleGame();
    const md = serializeFrontmatter(g, '2026-05-01');
    expect(md).toContain('---\n');
    expect(md).toContain('title: "Test Puzzle"');
    expect(md).toContain('provider: gamemonetize');
    expect(md).toContain('providerId: "abc123"');
    expect(md).toContain('embedUrl: "https://html5.gamemonetize.co/abc123/"');
    expect(md).toContain('categories:\n  - puzzle');
    expect(md).toContain('controls:\n  - mouse');
    expect(md).toContain('draft: true');
    expect(md).toContain('addedAt: 2026-05-01');
    expect(md).toContain('A test puzzle.');
  });

  it('escapes double quotes in titles', () => {
    const g = sampleGame({ title: 'Sam\'s "Big" Adventure' });
    const md = serializeFrontmatter(g, '2026-05-01');
    expect(md).toContain('title: "Sam\'s \\"Big\\" Adventure"');
  });

  it('omits empty tags and rank fields cleanly', () => {
    const g = sampleGame({ tags: [] });
    const md = serializeFrontmatter(g, '2026-05-01');
    expect(md).toContain('tags: []');
    expect(md).not.toContain('rank:');
    expect(md).not.toContain('featured:');   // always defaults to false in schema; omit
  });
});

describe('dedupeAgainstExisting', () => {
  it('drops entries whose slug already exists on disk', () => {
    const input = [sampleGame({ slug: 'keep-me' }), sampleGame({ slug: 'already-there' })];
    const existing = new Set(['already-there']);
    const out = dedupeAgainstExisting(input, existing);
    expect(out.map((g) => g.slug)).toEqual(['keep-me']);
  });

  it('returns input unchanged when no collisions', () => {
    const input = [sampleGame({ slug: 'a' }), sampleGame({ slug: 'b' })];
    const out = dedupeAgainstExisting(input, new Set());
    expect(out).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to fail**

```bash
npm run test
```

Expected: fails with `Cannot find module '../../src/lib/ingest'`.

- [ ] **Step 3: Implement `src/lib/ingest.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/ingest.ts`:

```ts
import type { NormalizedGame } from './providers/types';

const CONTENT_DIR = 'src/content/games';

export function filenameFor(game: NormalizedGame): string {
  // Flat path: the spec requires /games/<slug>/ URLs, and Astro derives slugs
  // from the file path relative to the collection root. Nesting by provider
  // would produce /games/gamemonetize/<slug>/. Thumbnails stay nested in
  // public/thumbnails/<provider>/ because they're served as static assets
  // and not routed by Astro.
  return `${CONTENT_DIR}/${game.slug}.md`;
}

function yamlString(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

function yamlList(items: string[], indent = '  '): string {
  if (items.length === 0) return '[]';
  return '\n' + items.map((i) => `${indent}- ${i}`).join('\n');
}

export function serializeFrontmatter(game: NormalizedGame, isoDate: string): string {
  const lines: string[] = [
    '---',
    `title: ${yamlString(game.title)}`,
    `provider: ${game.provider}`,
    `providerId: ${yamlString(game.providerId)}`,
    `embedUrl: ${yamlString(game.embedUrl)}`,
    'thumbnail:',
    `  src: ${yamlString(`/thumbnails/${game.provider}/${game.providerId}.webp`)}`,
    `  width: ${game.thumbnail.width}`,
    `  height: ${game.thumbnail.height}`,
    `categories:${yamlList(game.categories)}`,
    `tags: ${game.tags.length > 0 ? yamlList(game.tags) : '[]'}`,
    `controls:${yamlList(game.controls)}`,
    `orientation: ${game.orientation}`,
    `addedAt: ${isoDate}`,
    'draft: true',
    '---',
    '',
    '<!-- ingested — add editorial review here before setting draft: false -->',
    '',
    game.description.trim(),
    '',
  ];
  return lines.join('\n');
}

export function dedupeAgainstExisting(
  games: NormalizedGame[],
  existingSlugs: Set<string>,
): NormalizedGame[] {
  return games.filter((g) => !existingSlugs.has(g.slug));
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test
```

Expected: 5 new tests pass. Full suite: 68 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ingest.ts tests/unit/ingest.test.ts
git commit -m "feat: ingest core (filename, frontmatter serialization, dedup)"
```

---

## Task 9: GameMonetize ingest CLI — script

**Files:**
- Create: `scripts/ingest-gamemonetize.ts`
- Modify: `package.json`

The CLI: `npm run ingest:gamemonetize -- --limit 20`. Fetches GameMonetize's feed, normalizes, dedupes, writes markdown + thumbnails. Does **not** set `draft: false` — that's the human review step.

- [ ] **Step 1: Install `commander`**

```bash
npm install --save-dev commander
```

- [ ] **Step 2: Write the CLI**

Write `/Users/egalvans/Downloads/Head/Claude/portal/scripts/ingest-gamemonetize.ts`:

```ts
#!/usr/bin/env tsx
import { Command } from 'commander';
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProvider } from '../src/lib/providers/index';
import { filenameFor, serializeFrontmatter, dedupeAgainstExisting } from '../src/lib/ingest';
import type { NormalizedGame } from '../src/lib/providers/types';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

async function readExistingSlugs(): Promise<Set<string>> {
  const dir = join(ROOT, 'src/content/games');
  const slugs = new Set<string>();
  async function walk(d: string) {
    try {
      const entries = await readdir(d, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) await walk(join(d, e.name));
        else if (e.name.endsWith('.md')) slugs.add(e.name.replace(/\.md$/, ''));
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
  await walk(dir);
  return slugs;
}

async function downloadThumbnail(game: NormalizedGame): Promise<void> {
  const outDir = join(ROOT, 'public/thumbnails', game.provider);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${game.providerId}.webp`);
  try {
    await stat(outPath);
    return;   // already cached
  } catch {
    // fall through to download
  }
  const res = await fetch(game.thumbnail.src);
  if (!res.ok) {
    console.warn(`[ingest] skipped thumbnail for ${game.slug}: ${res.status} ${res.statusText}`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
}

async function writeGameMarkdown(game: NormalizedGame, isoDate: string): Promise<void> {
  const outPath = join(ROOT, filenameFor(game));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, serializeFrontmatter(game, isoDate), 'utf-8');
}

async function main() {
  const program = new Command();
  program
    .option('--limit <n>', 'max games to ingest in this run', (v) => parseInt(v, 10), 20)
    .option('--category <id>', 'optional provider category filter')
    .option('--dry-run', 'print what would be written, do not touch disk', false)
    .parse(process.argv);

  const opts = program.opts<{ limit: number; category?: string; dryRun: boolean }>();
  const today = new Date().toISOString().slice(0, 10);

  const provider = getProvider('gamemonetize');
  console.log(`[ingest] fetching from ${provider.displayName} (limit=${opts.limit})`);
  let games = await provider.fetchCatalog({ limit: opts.limit });

  if (opts.category) {
    const want = opts.category.toLowerCase();
    games = games.filter((g) => g.categories.includes(want as NormalizedGame['categories'][number]));
  }

  const existing = await readExistingSlugs();
  const fresh = dedupeAgainstExisting(games, existing);
  console.log(`[ingest] ${games.length} fetched, ${fresh.length} new (${games.length - fresh.length} dedup skipped)`);

  if (fresh.length === 0) {
    console.log('[ingest] nothing to do.');
    return;
  }

  if (opts.dryRun) {
    for (const g of fresh) {
      console.log(`DRY — would write ${filenameFor(g)}`);
    }
    return;
  }

  let written = 0;
  for (const g of fresh) {
    await writeGameMarkdown(g, today);
    await downloadThumbnail(g);
    written++;
  }
  console.log(`[ingest] wrote ${written} draft markdown files to src/content/games/`);
  console.log('[ingest] Next: review each, write editorial body, set draft: false, commit.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Add `ingest:gamemonetize` script**

Open `/Users/egalvans/Downloads/Head/Claude/portal/package.json` → `"scripts"`. Add:

```json
"ingest:gamemonetize": "tsx scripts/ingest-gamemonetize.ts"
```

- [ ] **Step 4: Dry-run smoke**

```bash
npm run ingest:gamemonetize -- --limit 3 --dry-run
```

Expected: prints 3 `DRY — would write ...` lines against live GameMonetize data. No files written.

If this fails because GameMonetize's feed URL has changed, update `gamemonetizeProvider.fetchCatalog` in `src/lib/providers/gamemonetize.ts` (the URL lives there). The script itself is provider-agnostic.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/ingest-gamemonetize.ts
git commit -m "feat: gamemonetize ingest CLI with --limit / --category / --dry-run"
```

---

## Task 10: New-post scaffold CLI

**Files:**
- Create: `scripts/new-post.ts`
- Modify: `package.json`

Scaffolds a dated markdown file under `src/content/blog/`. Low-ceremony: one prompt's worth of flags, writes an empty skeleton.

- [ ] **Step 1: Write the script**

Write `/Users/egalvans/Downloads/Head/Claude/portal/scripts/new-post.ts`:

```ts
#!/usr/bin/env tsx
import { Command } from 'commander';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  const program = new Command();
  program
    .requiredOption('--title <title>', 'post title')
    .option('--date <iso>', 'publish date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
    .option('--related <slugs>', 'comma-separated game slugs', '')
    .parse(process.argv);

  const opts = program.opts<{ title: string; date: string; related: string }>();
  const slug = slugify(opts.title);
  const filename = `${opts.date}-${slug}.md`;
  const outPath = join(ROOT, 'src/content/blog', filename);

  try {
    await stat(outPath);
    console.error(`[new:post] ${filename} already exists. Pick a different title.`);
    process.exit(1);
  } catch { /* not there; good */ }

  const related = opts.related
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const frontmatter = [
    '---',
    `title: "${opts.title.replace(/"/g, '\\"')}"`,
    `description: ""   # 150–200 chars for meta description`,
    `publishedAt: ${opts.date}`,
    `tags: []`,
    `relatedGames:${
      related.length === 0 ? ' []' : '\n' + related.map((s) => `  - ${s}`).join('\n')
    }`,
    `draft: true`,
    '---',
    '',
    `# ${opts.title}`,
    '',
    '<!-- First sentence: the factual, citable summary. -->',
    '',
    '## How it plays / what it covers',
    '',
    '## Why it matters',
    '',
    '## Related games on Kloopik',
    '',
    related.length > 0
      ? related.map((s) => `- [${s}](/games/${s}/)`).join('\n')
      : '- _Add 2+ internal links to games on Kloopik._',
    '',
  ].join('\n');

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, frontmatter, 'utf-8');
  console.log(`[new:post] wrote ${outPath}`);
  console.log('[new:post] When done, set draft: false and commit.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add `new:post` script**

In `package.json` `"scripts"`:

```json
"new:post": "tsx scripts/new-post.ts"
```

- [ ] **Step 3: Smoke test**

```bash
npm run new:post -- --title "Hello Draft" --related slither-io,2048
ls src/content/blog/
```

Expected: a file like `2026-04-21-hello-draft.md` exists with populated frontmatter.

**Delete the smoke file before committing:**

```bash
rm src/content/blog/*-hello-draft.md
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/new-post.ts
git commit -m "feat: new:post scaffold CLI for blog drafts"
```

---

## Task 11: Internal link checker

**Files:**
- Create: `scripts/check-links.ts`
- Modify: `package.json`

Validates that all `relatedGames` in blog frontmatter point to real, non-draft game slugs. Used by the `content-check.yml` workflow in Task 14.

- [ ] **Step 1: Write the script**

Write `/Users/egalvans/Downloads/Head/Claude/portal/scripts/check-links.ts`:

```ts
#!/usr/bin/env tsx
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await walk(full, out);
      else if (e.name.endsWith('.md') || e.name.endsWith('.mdx')) out.push(full);
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  return out;
}

async function main() {
  const gameFiles = await walk(join(ROOT, 'src/content/games'));
  const publishedSlugs = new Set<string>();
  for (const file of gameFiles) {
    const raw = await readFile(file, 'utf-8');
    const { data } = matter(raw);
    if (data.draft === true) continue;
    const slug = file.split('/').pop()!.replace(/\.mdx?$/, '');
    publishedSlugs.add(slug);
  }

  const blogFiles = await walk(join(ROOT, 'src/content/blog'));
  const errors: string[] = [];
  for (const file of blogFiles) {
    const raw = await readFile(file, 'utf-8');
    const { data } = matter(raw);
    const related: unknown = data.relatedGames;
    if (!Array.isArray(related)) continue;
    for (const slug of related) {
      if (typeof slug !== 'string') continue;
      if (!publishedSlugs.has(slug)) {
        errors.push(`${file}: relatedGames points to unknown/draft slug "${slug}"`);
      }
    }
  }

  // Check all thumbnail src paths resolve (for local paths only)
  for (const file of gameFiles) {
    const raw = await readFile(file, 'utf-8');
    const { data } = matter(raw);
    if (data.draft === true) continue;
    const src = data?.thumbnail?.src;
    if (typeof src !== 'string') continue;
    if (!src.startsWith('/')) continue;   // external URL, skip
    try {
      await stat(join(ROOT, 'public', src));
    } catch {
      errors.push(`${file}: thumbnail.src "${src}" does not exist under public/`);
    }
  }

  if (errors.length > 0) {
    console.error('[check:links] broken references:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log(`[check:links] ok — ${publishedSlugs.size} games, ${blogFiles.length} blog posts, no broken internal links`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add `check:links` script**

In `package.json`:

```json
"check:links": "tsx scripts/check-links.ts"
```

- [ ] **Step 3: Smoke test**

```bash
npm run check:links
```

Expected: ok — 5 games, 1 blog post. (Plan 2 seeded 5 games + 1 blog post.)

Artificially break it to verify it actually fails:

```bash
# Edit the blog post frontmatter temporarily to add a bogus slug to relatedGames
# Run the check, confirm exit code 1, then revert.
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json scripts/check-links.ts
git commit -m "feat: internal link checker for blog relatedGames and thumbnails"
```

---

## Task 12: `.env.example` + README scripts section

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update `.env.example`**

Open `/Users/egalvans/Downloads/Head/Claude/portal/.env.example`. Add (if not already present):

```
# Analytics
PUBLIC_GTM_ID=GTM-XXXXXXX
PUBLIC_GA4_ID=G-XXXXXXXXXX
PUBLIC_CF_ANALYTICS_TOKEN=

# Site
PUBLIC_SITE_URL=https://www.kloopik.com
```

(Plan 1 seeded some of these already. Confirm they all exist; add any missing.)

- [ ] **Step 2: Add a `Scripts` section to README**

Open `/Users/egalvans/Downloads/Head/Claude/portal/README.md`. Add a section near the top:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: README scripts and env reference"
```

---

## Task 13: GitHub Actions — `ci.yml`

**Files:**
- Create: `.github/workflows/ci.yml`

Runs on every push and PR: install, typecheck, build, test. Free GitHub Actions for public repos.

- [ ] **Step 1: Write the workflow**

Write `/Users/egalvans/Downloads/Head/Claude/portal/.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Astro typecheck
        run: npx astro check

      - name: Unit tests
        run: npm test

      - name: Build
        run: npm run build
        env:
          PUBLIC_GTM_ID: GTM-TEST
          PUBLIC_GA4_ID: G-TEST
          PUBLIC_CF_ANALYTICS_TOKEN: test-token
          PUBLIC_SITE_URL: https://www.kloopik.com
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: typecheck + test + build on every push and PR"
```

- [ ] **Step 3: Verify run on PR**

Create a throwaway branch, push, open a PR:

```bash
git checkout -b ci-smoke
git commit --allow-empty -m "ci smoke"
git push -u origin ci-smoke
gh pr create --title "CI smoke" --body "Verify CI workflow runs."
```

Watch the Actions tab. Expected: green after ~2 min.

Close the PR and delete the branch once green:

```bash
gh pr close ci-smoke
git checkout main
git branch -D ci-smoke
git push origin --delete ci-smoke
```

---

## Task 14: GitHub Actions — Lighthouse

**Files:**
- Create: `lighthouserc.cjs`
- Create: `.github/workflows/lighthouse.yml`
- Modify: `package.json`

Runs Lighthouse CI against the Cloudflare Pages **preview URL** for every PR. Fails if budgets regress past spec thresholds.

- [ ] **Step 1: Install `@lhci/cli`**

```bash
npm install --save-dev @lhci/cli
```

- [ ] **Step 2: Write `lighthouserc.cjs`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/lighthouserc.cjs`:

```js
// Thresholds match performance budgets in docs/superpowers/specs/2026-04-21-kloopik-games-portal-design.md
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      // URLs are injected by the workflow via LHCI_URL_* env vars.
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

- [ ] **Step 3: Write `.github/workflows/lighthouse.yml`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/.github/workflows/lighthouse.yml`:

```yaml
name: Lighthouse

on:
  pull_request:
    branches: [main]

jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Wait for Cloudflare Pages preview
        id: cf
        uses: WalshyDev/cf-pages-await@v1
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          project: 'kloopik'
          commitHash: ${{ github.event.pull_request.head.sha }}

      - name: Run Lighthouse CI
        run: |
          npx lhci autorun \
            --collect.url="${{ steps.cf.outputs.url }}/" \
            --collect.url="${{ steps.cf.outputs.url }}/games/" \
            --collect.url="${{ steps.cf.outputs.url }}/blog/"
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

The `WalshyDev/cf-pages-await` action polls Cloudflare for the preview URL matching this PR's commit SHA.

- [ ] **Step 4: Add required secrets in GitHub repo settings**

In the GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

- `CF_API_TOKEN` — Cloudflare API token with `Pages:Read` permission (create in Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom template → Permissions: `Account > Cloudflare Pages > Read`).
- `CF_ACCOUNT_ID` — Cloudflare account ID (visible on any dashboard page, lower right).
- `LHCI_GITHUB_APP_TOKEN` — optional; only needed to post results back to PRs. Install the [Lighthouse CI GitHub App](https://github.com/apps/lighthouse-ci) to get it.

**Important:** Adding repo secrets is a sensitive action. Confirm with the user before doing this step and ask them to add the secrets themselves if they prefer.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lighthouserc.cjs .github/workflows/lighthouse.yml
git commit -m "ci: lighthouse budgets on PR preview URLs"
```

---

## Task 15: GitHub Actions — content check

**Files:**
- Create: `.github/workflows/content-check.yml`

Runs only on PRs that touch `src/content/**` or `public/thumbnails/**`. Enforces schema + `check:links`.

- [ ] **Step 1: Write the workflow**

Write `/Users/egalvans/Downloads/Head/Claude/portal/.github/workflows/content-check.yml`:

```yaml
name: Content check

on:
  pull_request:
    paths:
      - 'src/content/**'
      - 'public/thumbnails/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Validate content schemas (via astro check)
        run: npx astro check
        env:
          PUBLIC_GTM_ID: GTM-TEST
          PUBLIC_GA4_ID: G-TEST
          PUBLIC_CF_ANALYTICS_TOKEN: test-token
          PUBLIC_SITE_URL: https://www.kloopik.com

      - name: Internal link + thumbnail check
        run: npm run check:links
```

`astro check` runs the Zod schemas in `src/content/config.ts` against every markdown file. Schema violations fail the job — no broken games or blog posts ever land in `main`.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/content-check.yml
git commit -m "ci: content schema + internal link validation on content PRs"
```

---

## Task 16: Cloudflare Pages env vars + build config

**Files:**
- Create: `docs/runbooks/dns-and-domain.md`

Configure the production environment in the Cloudflare Pages dashboard. This is manual and requires user action.

- [ ] **Step 1: Write the DNS + domain runbook**

Write `/Users/egalvans/Downloads/Head/Claude/portal/docs/runbooks/dns-and-domain.md`:

```markdown
# DNS + domain setup

## Goal state

- `www.kloopik.com` → Cloudflare Pages deployment (canonical).
- `kloopik.com` → 301 redirect to `https://www.kloopik.com/` (apex rule).
- All HTTP → HTTPS (Cloudflare default).
- `CNAME` file in repo root preserved (Cloudflare Pages uses it to validate the custom domain binding).

## Steps

1. **Confirm Pages project exists.** In Cloudflare dashboard → Workers & Pages → `kloopik`. It was created in Plan 1 Task 15.

2. **Production branch.** Project → Settings → Builds & deployments → Production branch = `main`. Build command: `npm run build`. Build output: `dist`. Root directory: `/`.

3. **Environment variables (production + preview).** Project → Settings → Environment variables → add for both Production and Preview:

   | Key | Value |
   |---|---|
   | `PUBLIC_GTM_ID` | `GTM-XXXXXXX` (from Task 18) |
   | `PUBLIC_GA4_ID` | `G-XXXXXXXXXX` (from Task 18) |
   | `PUBLIC_CF_ANALYTICS_TOKEN` | token from Cloudflare Web Analytics → Add a site |
   | `PUBLIC_SITE_URL` | `https://www.kloopik.com` |
   | `NODE_VERSION` | `20` |

4. **Custom domain binding.**
   - Project → Custom domains → Add custom domain → `www.kloopik.com`. Cloudflare DNS auto-creates a CNAME.
   - Add a second domain → `kloopik.com`. Cloudflare creates an apex record.

5. **Apex → www redirect.**
   - Cloudflare dashboard → kloopik.com zone → Rules → Redirect Rules → Create rule:
     - When: Hostname equals `kloopik.com`
     - Then: Static redirect to `https://www.kloopik.com$1` (status 301, preserve query string).

6. **Verify.**
   - `curl -I https://www.kloopik.com/` → 200.
   - `curl -I https://kloopik.com/` → 301 `location: https://www.kloopik.com/`.
   - `curl -I http://kloopik.com/` → 301 to https.

7. **TLS.** Cloudflare issues a certificate automatically within ~60s of custom domain binding.
```

- [ ] **Step 2: Walk the user through the Cloudflare dashboard**

Since these changes happen in Cloudflare's dashboard (not in git), pause here. Present the runbook to the user and ask:

> "Runbook at `docs/runbooks/dns-and-domain.md`. Please run through steps 2–6 in your Cloudflare dashboard now. Reply `done` once `curl -I https://www.kloopik.com/` returns 200 and the apex redirect works."

Wait for confirmation before moving to Task 17.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/dns-and-domain.md
git commit -m "docs: DNS + domain runbook"
```

---

## Task 17: Google Search Console + sitemap submission

**Files:**
- Create: `docs/runbooks/gsc-and-analytics.md`

- [ ] **Step 1: Write the runbook**

Write `/Users/egalvans/Downloads/Head/Claude/portal/docs/runbooks/gsc-and-analytics.md`:

```markdown
# Google Search Console + Analytics setup

## A. Google Search Console

1. Go to https://search.google.com/search-console.
2. Add property → **Domain property** (not URL prefix): `kloopik.com`. This covers both `www` and apex.
3. Verification method: DNS TXT record. Copy the TXT value Google gives you.
4. Cloudflare dashboard → kloopik.com zone → DNS → Records → Add TXT record:
   - Name: `@`
   - Content: `google-site-verification=...`
   - TTL: Auto
5. Back in GSC → Verify. Usually takes <60s.
6. **Submit sitemap:** GSC → Sitemaps → Add new sitemap → `sitemap-index.xml`. Submit.
7. Within 24–48h, GSC starts reporting.

## B. Google Analytics 4 (via GTM)

1. Go to https://analytics.google.com → Admin → Create property → `Kloopik`. Choose Web data stream for `https://www.kloopik.com`.
2. Note the Measurement ID (`G-XXXXXXXXXX`) — this goes into the `PUBLIC_GA4_ID` env var.
3. In GA4 → Admin → Property → Data Streams → click the stream → **Configure tag settings → Enable "Cookieless pings"** so the stream reports modeled data when consent is denied (requires Consent Mode v2, wired in Plan 1 Task 9).
4. Link GSC: GA4 → Admin → Product Links → Search Console → Link → pick the `kloopik.com` property.

## C. Google Tag Manager

1. Go to https://tagmanager.google.com → Create Account → `Kloopik`, Container name `www.kloopik.com`, target `Web`.
2. Note the container ID (`GTM-XXXXXXX`) — this goes into `PUBLIC_GTM_ID`.
3. Inside the container → Tags → New:
   - Name: `GA4 Configuration`
   - Tag type: Google Tag
   - Measurement ID: `G-...` (same as GA4 property).
   - Consent settings → "Requires additional consent" → add `analytics_storage` and `ad_storage`.
   - Trigger: **All Pages**.
4. Publish the container (top-right → Submit → name the version, publish).

## D. Cloudflare Web Analytics

1. Cloudflare dashboard → Analytics & Logs → Web Analytics → Add a site → `www.kloopik.com`.
2. Select "Automatic setup" if the domain is on Cloudflare (it is). Token is issued automatically; copy it into `PUBLIC_CF_ANALYTICS_TOKEN` in the Pages env vars.
3. The beacon is injected in `BaseLayout` in Plan 1 Task 10.

## E. Verify end-to-end

After the next deploy:

- Visit `https://www.kloopik.com/` in a private window.
- Dismiss consent banner → Accept.
- GA4 → Realtime → you should appear within ~30s.
- CF Web Analytics → page view appears within ~5 min regardless of consent.
- GTM → Preview mode → confirms GA4 Configuration fired after consent.

## F. Ongoing

- Monthly: GSC → Performance → export top queries → feed editorial calendar.
- Monthly: GA4 → Engagement → Pages → identify best-performing games → consider pinning via `src/data/featured.ts`.
```

- [ ] **Step 2: Walk the user through setup**

These are external-account changes. Present the runbook and:

> "Runbook at `docs/runbooks/gsc-and-analytics.md`. Please complete sections A–D. Reply with the GTM container ID (`GTM-...`), GA4 Measurement ID (`G-...`), and CF Web Analytics token when ready — I'll plug them into the Pages env vars."

On receiving the IDs, the user (or their CI) updates the Cloudflare Pages env vars and triggers a re-deploy. The repo has no further change here.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/gsc-and-analytics.md
git commit -m "docs: GSC + GA4 + GTM + CF Web Analytics runbook"
```

---

## Task 18: Bulk ingest — batch 1 (10 games)

**Files:**
- Create: `src/content/games/*.md` (10 new)
- Create: `public/thumbnails/gamemonetize/*.webp` (10 new)

The first of five ingest/review/merge cycles that get the catalog to ~50 games total.

**Important:** ingested games are written flat into `src/content/games/` (same directory as the 5 Plan 2 seeds), which keeps Astro's auto-generated slugs flat (`<slug>`, not `gamemonetize/<slug>`) so URLs stay `/games/<slug>/` per the spec. Thumbnails remain nested under `public/thumbnails/gamemonetize/` because they're static assets, not routed content. If an ingested slug collides with an existing one, the ingest script's dedupe step skips it.

- [ ] **Step 1: Run the ingest**

```bash
cd /Users/egalvans/Downloads/Head/Claude/portal
npm run ingest:gamemonetize -- --limit 10
```

Expected:
- `[ingest] fetching from GameMonetize (limit=10)`
- `[ingest] 10 fetched, 10 new (0 dedup skipped)`
- `[ingest] wrote 10 draft markdown files to src/content/games/`
- 10 new `.md` files in `src/content/games/` + 10 new `.webp` thumbnails in `public/thumbnails/gamemonetize/`.

- [ ] **Step 2: Human review (per file)**

For each of the 10 markdown files:

1. Read the provider's `description` block at the bottom.
2. Decide: **ship** (worth publishing) or **kill** (delete file + thumbnail).
3. If shipping, write a 200–400 word editorial review inside the body (replace the `<!-- ingested -->` comment and the raw provider description). Use the spec's template:
   - First sentence = one factual, citable summary ("Slither.io is a multiplayer snake game...").
   - 2–3 sentences on how it plays and controls.
   - Short "what's good / what's not" paragraph.
   - 2–3 "if you like this" links to other games already on the site.
4. Confirm the `categories` guess is correct; edit if not.
5. Set `draft: false`.

Kill/ship ratio will typically be ~60% ship, 40% kill. Target 6–8 ships from this batch of 10.

- [ ] **Step 3: Run `check:links` + `astro check`**

```bash
npm run check:links
npx astro check
```

Expected: both pass.

- [ ] **Step 4: Build + visual smoke**

```bash
npm run build
npm run preview   # or `npx wrangler pages dev dist`
```

Open the home page and `/games/` — the new games should appear in the grid. Click through 2–3 and confirm the detail pages render.

- [ ] **Step 5: Commit + PR**

```bash
git add src/content/games/ public/thumbnails/gamemonetize/
git commit -m "content: ingest batch 1 (6-8 games from GameMonetize)"
git push -u origin HEAD:content/ingest-batch-1
gh pr create --title "content: ingest batch 1" --body "First batch of GameMonetize ingests. 6–8 human-reviewed games."
```

Wait for CI + Lighthouse green on the preview URL.

- [ ] **Step 6: Merge**

```bash
gh pr merge --squash --delete-branch
```

Wait for CF Pages production deployment to complete (~1 min).

---

## Task 19: Bulk ingest — batches 2–5

Same loop as Task 18, four more times. The loop is designed to stay under 2 hours of editorial time per batch.

- [ ] **Step 1: Batch 2 (10 games, target 6–8 ships)**

```bash
git checkout main && git pull
npm run ingest:gamemonetize -- --limit 10
# Review, edit, set draft:false on shippable files, delete killed files
npm run check:links && npx astro check && npm run build
git checkout -b content/ingest-batch-2
git add src/content/games/ public/thumbnails/gamemonetize/
git commit -m "content: ingest batch 2"
git push -u origin content/ingest-batch-2
gh pr create --title "content: ingest batch 2" --body "Second ingest batch."
# After CI green:
gh pr merge --squash --delete-branch
```

- [ ] **Step 2: Batch 3 (10 games, target 6–8 ships)**

Repeat Step 1 with `ingest-batch-3`.

- [ ] **Step 3: Batch 4 (10 games, target 6–8 ships)**

Repeat with `ingest-batch-4`.

- [ ] **Step 4: Batch 5 (10 games, target 6–8 ships)**

Repeat with `ingest-batch-5`. After merge, verify total published game count on production:

```bash
curl -s https://www.kloopik.com/sitemap-0.xml | grep -c '/games/'
```

Expected: 45–55 game URLs in the sitemap (5 seeds + ~40 ingested, accounting for kills).

If the count is <45, either run one more ingest batch or accept the shorter catalog for launch — the spec says 50–300, so 45+ meets the floor.

---

## Task 20: First real editorial blog post

**Files:**
- Create: `src/content/blog/2026-05-08-best-free-puzzle-games-browser-2026.md`

The seed blog post from Plan 2 was a format exercise. This is the first real editorial piece — internal-linking heavy, citable, links to at least 6 games on the site.

- [ ] **Step 1: Scaffold**

```bash
cd /Users/egalvans/Downloads/Head/Claude/portal
npm run new:post -- --title "Best Free Puzzle Games You Can Play in a Browser (2026)" \
  --date 2026-05-08 \
  --related 2048,test-puzzle,another-slug,another,another,another
```

(Replace the `--related` slugs with 6 actual slugs from the puzzle category after merging all ingest batches. Use `grep -l "categories:.*puzzle" src/content/games/*.md | xargs -n1 basename | sed 's/\.md$//'` to pick real slugs.)

- [ ] **Step 2: Write the body**

Open the generated file. Fill in:

- **Description** (150–180 chars): one-sentence pitch. Appears as meta description and in AI-search summaries.
- **First paragraph**: one factual, citable sentence ("Browser puzzle games have matured into a serious casual-gaming category in 2026, with titles that rival paid mobile apps."). Follow with 2–3 sentences of context.
- **Body**: 6–8 short sections, one per featured puzzle game. Each section: 1 screenshot reference (`![title](/thumbnails/gamemonetize/<id>.webp)`), 80–150 words, internal link `[Play <game> on Kloopik](/games/<slug>/)`.
- **Conclusion**: 2 sentences wrapping up, link to `/categories/puzzle/`.
- Set `draft: false`.

Word count target: 1200–1800 words.

- [ ] **Step 3: Validate**

```bash
npm run check:links
npx astro check
npm run build
```

Expected: all pass. Preview the post at `/blog/best-free-puzzle-games-browser-2026/` in `npm run preview`.

- [ ] **Step 4: Commit + PR**

```bash
git checkout -b content/first-blog-post
git add src/content/blog/2026-05-08-best-free-puzzle-games-browser-2026.md
git commit -m "content: first editorial post — best free browser puzzle games 2026"
git push -u origin content/first-blog-post
gh pr create --title "content: first editorial blog post" --body "Internal-linking heavy puzzle-games roundup."
```

After CI green:

```bash
gh pr merge --squash --delete-branch
```

---

## Task 21: Launch verification

**Files:**
- Create: `docs/runbooks/launch-checklist.md`

One pass over the whole site on production to confirm nothing is broken before declaring launch.

- [ ] **Step 1: Write the launch checklist**

Write `/Users/egalvans/Downloads/Head/Claude/portal/docs/runbooks/launch-checklist.md`:

```markdown
# Launch checklist

Run through on production (`https://www.kloopik.com/`) in a private window.

## Functional
- [ ] Home page loads and renders the featured grid.
- [ ] Click 3 random games from the home grid → detail pages render with player, description, favorite button.
- [ ] Click "Play" on a game → iframe loads, ad plays, game starts.
- [ ] Star a game → reload → favorite persists. Navigate to `/favorites/` → the game appears.
- [ ] Unstar from `/favorites/` → game disappears immediately and on reload.
- [ ] Header search: type "puzzle" → suggestions appear. Enter → `/search/?q=puzzle` returns ranked results.
- [ ] Click a category link → `/categories/<id>/` renders with games scoped to that category.
- [ ] Blog index → click the real editorial post → renders with images, internal links, JSON-LD article schema.
- [ ] 404: visit `/not-a-page/` → custom 404 renders with nav back to home.

## SEO
- [ ] `curl -I https://www.kloopik.com/` → 200.
- [ ] `curl -I https://kloopik.com/` → 301 to `https://www.kloopik.com/`.
- [ ] View-source on a game page → `<title>`, meta description, canonical, og:*, twitter:*, `VideoGame` JSON-LD, `BreadcrumbList` JSON-LD all present.
- [ ] `curl https://www.kloopik.com/sitemap-index.xml` → valid XML, lists game + blog + static sub-sitemaps.
- [ ] `curl https://www.kloopik.com/robots.txt` → Sitemap directive present.
- [ ] `curl https://www.kloopik.com/llms.txt` → valid, lists top content.
- [ ] `curl https://www.kloopik.com/rss.xml` → valid RSS.
- [ ] Validate one JSON-LD block in https://validator.schema.org/ — zero errors.
- [ ] Validate sitemap in https://www.xml-sitemaps.com/validate-xml-sitemap.html.
- [ ] Submit `sitemap-index.xml` in Google Search Console → see "Success" within 24h.

## Analytics
- [ ] Accept consent in a private window → GA4 Realtime shows your session within 60s.
- [ ] Reject consent → no GA4 events fire (check Network → filter by `google-analytics`).
- [ ] CF Web Analytics → page view recorded regardless.
- [ ] GTM Preview mode → GA4 Configuration tag fires only after consent accept.

## Performance
- [ ] PageSpeed Insights on the home page → Performance ≥90 mobile, ≥95 desktop.
- [ ] PageSpeed Insights on a game detail page → Performance ≥85 mobile.
- [ ] Lighthouse CI workflow on last PR → green.

## Operational
- [ ] Cloudflare Pages → Deployments tab → most recent production deploy is green.
- [ ] GitHub Actions → all three workflows green on `main`.

## Cadence
- [ ] Calendar reminder: next blog post drafted by 2026-05-22 (2/month cadence).
- [ ] Calendar reminder: next ingest batch by 2026-05-29 (5–10 new games/month).
- [ ] Calendar reminder: monthly GSC query export on the 1st of each month.
```

- [ ] **Step 2: Run through the checklist**

Work through every box. For any unchecked item, file a GitHub issue with `launch-blocker` label. Do not proceed to Task 22 until all functional and SEO boxes are green.

- [ ] **Step 3: Commit**

```bash
git add docs/runbooks/launch-checklist.md
git commit -m "docs: launch verification checklist"
```

---

## Task 22: Final push + retrospective note

**Files:**
- Modify: `README.md` (launch date)

- [ ] **Step 1: Ensure local `main` is clean and in sync**

```bash
git checkout main
git status                  # must be clean
git pull origin main        # must be up to date
```

- [ ] **Step 2: Pin the launch date in README**

Open `/Users/egalvans/Downloads/Head/Claude/portal/README.md`. Add/update at the top:

```markdown
# Kloopik

Curated free browser games. Built with Astro on Cloudflare Pages. Launched 2026-05-XX.

Production: https://www.kloopik.com
```

(Replace `XX` with the actual launch day.)

- [ ] **Step 3: Commit and tag**

```bash
git add README.md
git commit -m "chore: mark production launch in README"
git tag -a v1.0.0 -m "v1.0.0 — public launch"
```

- [ ] **Step 4: Confirm with user before pushing the tag**

Pushing a release tag is a visible event. Ask the user:

> "Ready to push `v1.0.0` tag and the launch commit? Reply `push` to proceed."

On confirmation:

```bash
git push origin main
git push origin v1.0.0
```

- [ ] **Step 5: Write a retrospective (optional but recommended)**

Capture what went well, what surprised you, and what to adjust before the next 50 games:

- **Ingest ship/kill ratio** — was the 60/40 estimate right?
- **Average editorial time per shipped game** — sets the cadence ceiling.
- **Any schema issues** — categories that need splitting/merging.
- **Performance regressions** — did Lighthouse ever fail? What caused it?
- **Search quality** — does Fuse.js return useful results for real queries?

Save as `docs/retros/2026-05-XX-launch-retro.md`. No template required — plain notes are fine.

- [ ] **Step 6: Commit the retro**

```bash
git add docs/retros/
git commit -m "docs: launch retro notes"
git push
```

---

## Plan 3 exit criteria

- [ ] 45+ human-reviewed games live in production.
- [ ] 2 blog posts live (seed + first editorial).
- [ ] Favorites, header search, `/search/` page all working.
- [ ] OG images generate per-game and per-post at build; visible in social previews.
- [ ] `npm run ingest:gamemonetize`, `npm run new:post`, `npm run check:links` all operational.
- [ ] GitHub Actions: `ci.yml`, `lighthouse.yml`, `content-check.yml` green on main.
- [ ] GSC verified, sitemap submitted, GA4 firing via GTM with Consent Mode v2 gating.
- [ ] CF Web Analytics reporting.
- [ ] DNS: `www` canonical, apex 301s, HTTPS forced.
- [ ] Test suite: ~68 unit tests passing.
- [ ] Launch checklist (all functional + SEO boxes) complete.
- [ ] `v1.0.0` tag pushed.

---

## Test-count audit across plans

| Phase | New tests | Running total |
|---|---|---|
| Plan 1 Task 5 (smoke) | 1 | 1 |
| Plan 1 Task 6 (consent.ts) | 12 | 13 |
| Plan 2 Task 6 (storage.ts) | 10 | 23 |
| Plan 2 Task 7 (sort.ts) | 6 | 29 |
| Plan 2 Task 11 (seo.ts) | 11 | 40 |
| Plan 2 Task 12 (gamemonetize adapter) | 11 | 51 |
| Plan 3 Task 1 (favorites.ts) | 6 | 57 |
| Plan 3 Task 4 (search-index.ts) | 4 | 61 |
| Plan 3 Task 6 (og.ts) | 2 | 63 |
| Plan 3 Task 8 (ingest.ts) | 5 | 68 |

Final expected count at end of Plan 3: **68 tests passing.**
