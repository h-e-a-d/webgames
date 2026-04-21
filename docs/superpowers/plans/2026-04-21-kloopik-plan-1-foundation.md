# Kloopik — Plan 1: Foundation (Phases 0–1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tear down the old kloopik site and stand up a deployable, empty Astro scaffold on Cloudflare Pages with GTM+GA4, CF Web Analytics, and a Consent Mode v2 hand-rolled consent banner already wired.

**Architecture:** Astro 5 static site, TypeScript strict, deployed to Cloudflare Pages via the existing GitHub repo. Analytics stack: CF Web Analytics (cookieless, always on) + GTM container loading GA4 (gated by consent). Consent banner is a client-hydrated Astro island managing Google Consent Mode v2 advanced defaults.

**Tech Stack:** Astro 5, TypeScript, Zod (via Astro Content Collections), Cloudflare Pages, Google Tag Manager, Google Analytics 4, Cloudflare Web Analytics.

**Spec:** `docs/superpowers/specs/2026-04-21-kloopik-games-portal-design.md`

**Out of scope for this plan:** Any actual content (games, blog posts), any provider adapters, any site-wide styling beyond a minimal reset, JSON-LD, sitemaps, RSS, favorites, search. Those land in Plan 2 and Plan 3.

---

## File inventory for this plan

**Preserved from old repo:**
- `.git/` — full history preserved
- `.gitignore` — expanded for Astro
- `CNAME` — `www.kloopik.com`
- `docs/superpowers/specs/2026-04-21-kloopik-games-portal-design.md`
- `docs/superpowers/plans/2026-04-21-kloopik-plan-1-foundation.md` (this file)
- `docs/superpowers/plans/2026-04-15-gaming-portal.md` (historical, harmless)
- `docs/superpowers/plans/2026-04-20-snake-playwright.md` (historical, harmless)

**Created by this plan:**
- `package.json` — Astro dependencies, scripts
- `tsconfig.json` — strict TS extends from Astro base
- `astro.config.mjs` — integrations, output: static, site URL
- `.env.example` — `PUBLIC_GTM_ID`, `PUBLIC_GA4_ID`, `PUBLIC_CF_ANALYTICS_TOKEN`, `PUBLIC_SITE_URL`
- `.env.local.example` — local dev copy hint (identical format)
- `public/favicon.svg`
- `public/robots.txt` — temporary, Plan 2 replaces with dynamic
- `src/content/config.ts` — empty collections wired (games, blog) so build passes
- `src/env.d.ts` — Astro types + env var typing
- `src/layouts/BaseLayout.astro` — `<html>`, meta, GTM, CF Analytics, consent banner mount
- `src/components/ConsentBanner.astro` — island, Consent Mode v2 advanced defaults
- `src/lib/consent.ts` — pure consent state functions (TDD'd)
- `src/pages/index.astro` — placeholder home ("Kloopik — coming soon")
- `src/pages/404.astro` — static 404
- `src/styles/global.css` — minimal reset + one CSS var set
- `tests/unit/consent.test.ts` — unit tests for consent.ts (Vitest)
- `vitest.config.ts` — test runner config

**Deleted:**
Everything else at repo root and under `src/`, `functions/`, `games/`, `migrations/`, `public/` (except `favicon.svg` if we want to reuse), `_site/`, `.wrangler/`, `.playwright-cli/`, `.eleventy.js`, `wrangler.toml`, `package-lock.json`, plus Clerk/D1 resources external to the repo.

**Not yet created (Plan 2+):**
All routes beyond `/` and `/404`, sitemaps, components beyond ConsentBanner, content, data, providers, ingest scripts.

---

## Task 1: Nuke the old source tree

**Files:**
- Delete: everything at repo root except `.git/`, `.gitignore`, `CNAME`, `docs/`
- Modify: `.gitignore` (expand for Astro)

Teardown external resources (Clerk org, D1 database) is documented in Task 2 — this task is purely the filesystem nuke.

- [ ] **Step 1: Verify we are on `main` and working tree is clean**

```bash
git status
git branch --show-current
```

Expected: branch is `main`, working tree clean. If not clean, stash or commit first.

- [ ] **Step 2: Remove everything except preserved paths**

```bash
cd /Users/egalvans/Downloads/Head/Claude/portal
# Remove tracked files (preserves .git, .gitignore, CNAME, docs/)
git rm -rf --ignore-unmatch \
  _site functions games migrations node_modules public src tests test-results \
  .claude .playwright-cli .superpowers .wrangler \
  .eleventy.js .env.local.example DESIGN.md \
  package.json package-lock.json playwright.config.js wrangler.toml
# Remove any untracked junk
rm -rf _site node_modules test-results .wrangler .playwright-cli .superpowers .claude
# The only surviving tracked files should be CNAME + docs/**
git status
```

Expected: `git status` shows deletions staged, and only `.git/`, `.gitignore`, `CNAME`, `docs/` remain in the working tree (plus `.DS_Store` which is gitignored).

- [ ] **Step 3: Overwrite `.gitignore` for the new stack**

Write `/Users/egalvans/Downloads/Head/Claude/portal/.gitignore`:

```
# Astro
dist/
.astro/

# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Env
.env
.env.local
.env.*.local

# macOS
.DS_Store

# Editor
.vscode/
.idea/
*.swp

# Cloudflare
.wrangler/

# Build/test outputs
coverage/
```

- [ ] **Step 4: Commit the nuke**

```bash
git add -A
git commit -m "chore: nuke old eleventy site, preserve git history / CNAME / docs"
git log --oneline -5
```

Expected: new commit on top. `git log` shows history preserved.

---

## Task 2: Teardown external Cloudflare + Clerk resources

**Files:** none (infra dashboard actions)

This is a manual checklist, not code. Do this before scaffolding Astro so the infra is clean when the first new deploy lands.

- [ ] **Step 1: Delete the D1 database**

```bash
# From the old wrangler.toml: database_id = "007e9e36-6747-42c9-890e-4a15d2ac8fc2"
npx wrangler d1 delete kloopik-db
```

Confirm at the prompt. Expected: "Deleted 'kloopik-db' successfully."

If `wrangler` is not installed globally, `npx -y wrangler@latest d1 delete kloopik-db` works.

- [ ] **Step 2: Delete the Clerk organization**

Manual, in the Clerk dashboard:
1. Log in to https://dashboard.clerk.com
2. Select the `kloopik` application
3. Settings → Danger Zone → Delete application
4. Confirm

No domain on Clerk's side cares about this — removing the app invalidates the (already-public) publishable key.

- [ ] **Step 3: In the Cloudflare Pages dashboard, prepare env vars**

We will set these in Task 15 during the first deploy, but capture the actual values now so you don't have to chase them later. Open a note and record:

- `PUBLIC_GTM_ID` — create a new GTM container at https://tagmanager.google.com (name: "Kloopik Web", target platform: Web). Container ID format: `GTM-XXXXXXX`.
- `PUBLIC_GA4_ID` — create a new GA4 property at https://analytics.google.com (property name: "Kloopik", reporting time zone: your local, currency: USD). Measurement ID format: `G-XXXXXXXXXX`.
- `PUBLIC_CF_ANALYTICS_TOKEN` — in Cloudflare dashboard → Web Analytics → "Add a site" → `kloopik.com`. Copy the token from the generated beacon snippet (the `token` field inside the `<script data-cf-beacon="{...}">`).
- `PUBLIC_SITE_URL` — `https://www.kloopik.com`

Do **not** commit these to the repo. They go into `.env.local` locally and into CF Pages env vars in production.

- [ ] **Step 4: Link GA4 property to GTM**

In the GTM container:
1. Tags → New → Tag type: "Google tag" → Tag ID: the GA4 measurement ID from Step 3.
2. Trigger: "Initialization — All Pages".
3. Save (do not publish yet — we'll publish in Plan 3 after verifying on production).

This does not require a code change; captured as a checklist item so it isn't forgotten.

---

## Task 3: Initialize the Astro project in-place

**Files:**
- Create: `package.json`, `tsconfig.json`, `astro.config.mjs`, `src/env.d.ts`, `src/pages/index.astro`
- Create: `public/favicon.svg`

We bootstrap Astro manually (not via `npm create astro`) because the repo already has files we must preserve (`docs/`, `CNAME`, `.gitignore`). `npm create astro` wants an empty dir.

- [ ] **Step 1: Create `package.json`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/package.json`:

```json
{
  "name": "kloopik",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/egalvans/Downloads/Head/Claude/portal
npm install
```

Expected: `node_modules/` populated, `package-lock.json` created, no high-severity vulnerabilities reported.

- [ ] **Step 3: Create `tsconfig.json`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "~/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 4: Create `astro.config.mjs`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.kloopik.com',
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
});
```

Notes:
- `trailingSlash: 'always'` matches the spec's canonical URL policy.
- `format: 'directory'` produces `/about/index.html` instead of `/about.html` — needed for the trailing-slash policy.

- [ ] **Step 5: Create `src/env.d.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/env.d.ts`:

```ts
/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_GTM_ID: string;
  readonly PUBLIC_GA4_ID: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN: string;
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 6: Create a placeholder `src/pages/index.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/index.astro`:

```astro
---
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kloopik — Coming soon</title>
  </head>
  <body>
    <main>
      <h1>Kloopik</h1>
      <p>A curated browser games portal. Site under construction.</p>
    </main>
  </body>
</html>
```

(This is intentionally raw — a proper `BaseLayout` lands in Task 7. We need *something* that builds to verify the toolchain.)

- [ ] **Step 7: Create a minimal `public/favicon.svg`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0b0b10"/>
  <text x="16" y="22" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="18" fill="#f0f0fa">K</text>
</svg>
```

This is a placeholder — a designed favicon can replace it later without touching any code.

- [ ] **Step 8: Verify the dev server boots**

```bash
cd /Users/egalvans/Downloads/Head/Claude/portal
npm run dev
```

Expected output includes `Local  http://localhost:4321/`. Open it in a browser and see the "Kloopik — Coming soon" placeholder. Stop the server with Ctrl+C.

- [ ] **Step 9: Verify production build**

```bash
npm run build
ls dist/
```

Expected: `dist/index.html`, `dist/favicon.svg`. No build errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json astro.config.mjs src/ public/favicon.svg
git commit -m "feat: initialize astro 5 scaffold with strict typescript"
```

---

## Task 4: Create env.example and document local development

**Files:**
- Create: `.env.example`
- Create: `README.md`

- [ ] **Step 1: Create `.env.example`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/.env.example`:

```
# Copy this file to .env.local and fill in real values for local development.
# In production, set these in the Cloudflare Pages dashboard.

PUBLIC_SITE_URL=https://www.kloopik.com

# Google Tag Manager container ID, format: GTM-XXXXXXX
PUBLIC_GTM_ID=GTM-XXXXXXX

# GA4 measurement ID, format: G-XXXXXXXXXX
# Used only as a direct-load fallback if GTM fails; primary GA4 load is via GTM.
PUBLIC_GA4_ID=G-XXXXXXXXXX

# Cloudflare Web Analytics beacon token, 32-char hex from the dashboard
PUBLIC_CF_ANALYTICS_TOKEN=00000000000000000000000000000000
```

- [ ] **Step 2: Create a minimal `README.md`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/README.md`:

```markdown
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

## Stack

- Astro 5 (static output)
- Cloudflare Pages (hosting + CDN)
- Cloudflare Web Analytics (cookieless)
- Google Tag Manager → GA4 (consent-gated)
- Vitest (unit tests)

See `docs/superpowers/specs/2026-04-21-kloopik-games-portal-design.md` for the full design, and `docs/superpowers/plans/` for implementation plans.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs: add env example and readme"
```

---

## Task 5: Vitest configuration and first passing test

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/unit/smoke.test.ts`

This proves the test runner works before we write real tests in Task 6.

- [ ] **Step 1: Create `vitest.config.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
```

We'll need `jsdom` to test the consent banner's DOM interactions in Task 6.

- [ ] **Step 2: Install jsdom**

```bash
npm install --save-dev jsdom @types/jsdom
```

- [ ] **Step 3: Write a smoke test**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it and verify it passes**

```bash
npm run test
```

Expected: `1 passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/ package.json package-lock.json
git commit -m "chore: add vitest with jsdom environment"
```

---

## Task 6: Consent Mode v2 logic — TDD

**Files:**
- Create: `src/lib/consent.ts`
- Create: `tests/unit/consent.test.ts`

Build the pure functions that drive the consent banner. Hydration glue comes in Task 8. This task is pure logic and fully unit-tested.

Design:

- `ConsentState = { analytics: boolean; ads: boolean }` — what the user chose.
- Default state at page load: both `false` (Consent Mode v2 "denied" defaults).
- After `accept()`: both `true`, persisted to `localStorage` under `kloopik.consent.v1`.
- After `reject()`: both `false`, persisted.
- `loadConsent()` reads from `localStorage`, returns `null` if not set (caller shows banner).
- `toGtagConsentUpdate(state)` returns the object passed to `gtag('consent', 'update', ...)`.

- [ ] **Step 1: Write the failing test file**

Write `/Users/egalvans/Downloads/Head/Claude/portal/tests/unit/consent.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_DENIED,
  ACCEPT_ALL,
  REJECT_ALL,
  loadConsent,
  saveConsent,
  toGtagConsentUpdate,
  STORAGE_KEY,
} from '../../src/lib/consent';

describe('consent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('DEFAULT_DENIED', () => {
    it('denies both analytics and ads', () => {
      expect(DEFAULT_DENIED).toEqual({ analytics: false, ads: false });
    });
  });

  describe('ACCEPT_ALL / REJECT_ALL', () => {
    it('ACCEPT_ALL grants both', () => {
      expect(ACCEPT_ALL).toEqual({ analytics: true, ads: true });
    });

    it('REJECT_ALL denies both', () => {
      expect(REJECT_ALL).toEqual({ analytics: false, ads: false });
    });
  });

  describe('loadConsent', () => {
    it('returns null when nothing is stored', () => {
      expect(loadConsent()).toBeNull();
    });

    it('returns the stored state', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: true, ads: true }));
      expect(loadConsent()).toEqual({ analytics: true, ads: true });
    });

    it('returns null when stored value is malformed JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not-json');
      expect(loadConsent()).toBeNull();
    });

    it('returns null when stored shape is invalid', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
      expect(loadConsent()).toBeNull();
    });
  });

  describe('saveConsent', () => {
    it('persists the state as JSON', () => {
      saveConsent(ACCEPT_ALL);
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(ACCEPT_ALL);
    });

    it('round-trips via loadConsent', () => {
      saveConsent(REJECT_ALL);
      expect(loadConsent()).toEqual(REJECT_ALL);
    });
  });

  describe('toGtagConsentUpdate', () => {
    it('maps accept state to granted GA + Ads storage', () => {
      expect(toGtagConsentUpdate(ACCEPT_ALL)).toEqual({
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    });

    it('maps reject state to denied', () => {
      expect(toGtagConsentUpdate(REJECT_ALL)).toEqual({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    });

    it('maps mixed state correctly', () => {
      expect(toGtagConsentUpdate({ analytics: true, ads: false })).toEqual({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
npm run test
```

Expected: fails with "Cannot find module '../../src/lib/consent'" or equivalent.

- [ ] **Step 3: Implement `src/lib/consent.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/lib/consent.ts`:

```ts
export interface ConsentState {
  analytics: boolean;
  ads: boolean;
}

export const STORAGE_KEY = 'kloopik.consent.v1';

export const DEFAULT_DENIED: ConsentState = { analytics: false, ads: false };
export const ACCEPT_ALL: ConsentState = { analytics: true, ads: true };
export const REJECT_ALL: ConsentState = { analytics: false, ads: false };

function isConsentState(value: unknown): value is ConsentState {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ConsentState).analytics === 'boolean' &&
    typeof (value as ConsentState).ads === 'boolean'
  );
}

export function loadConsent(): ConsentState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isConsentState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(state: ConsentState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type GrantValue = 'granted' | 'denied';
export interface GtagConsentUpdate {
  analytics_storage: GrantValue;
  ad_storage: GrantValue;
  ad_user_data: GrantValue;
  ad_personalization: GrantValue;
}

export function toGtagConsentUpdate(state: ConsentState): GtagConsentUpdate {
  const a: GrantValue = state.analytics ? 'granted' : 'denied';
  const b: GrantValue = state.ads ? 'granted' : 'denied';
  return {
    analytics_storage: a,
    ad_storage: b,
    ad_user_data: b,
    ad_personalization: b,
  };
}
```

- [ ] **Step 4: Run tests and verify pass**

```bash
npm run test
```

Expected: `13 passed` (12 consent tests + 1 smoke test from Task 5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/consent.ts tests/unit/consent.test.ts
git commit -m "feat: consent mode v2 state logic with unit tests"
```

---

## Task 7: BaseLayout (no analytics yet)

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/styles/global.css`
- Modify: `src/pages/index.astro`

Introduce the layout before we start appending analytics/consent to it. Keeps each concern reviewable in isolation.

- [ ] **Step 1: Create minimal `src/styles/global.css`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/styles/global.css`:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  color: #111;
  background: #fff;
}
img, video { max-width: 100%; height: auto; display: block; }
a { color: inherit; }
:root {
  --color-bg: #ffffff;
  --color-fg: #111111;
  --color-muted: #6b7280;
  --color-accent: #2563eb;
}
```

The real design system arrives in Plan 2. This is intentionally minimal.

- [ ] **Step 2: Create `src/layouts/BaseLayout.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/layouts/BaseLayout.astro`:

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
  canonicalPath?: string;
}

const { title, description, canonicalPath } = Astro.props;
const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const canonical = canonicalPath ? `${siteUrl}${canonicalPath}` : `${siteUrl}${Astro.url.pathname}`;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="robots" content="index,follow" />
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [ ] **Step 3: Rewrite `src/pages/index.astro` to use BaseLayout**

Replace `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/index.astro` entirely:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="Kloopik — Coming soon"
  description="A curated browser games portal. Site under construction."
  canonicalPath="/"
>
  <main>
    <h1>Kloopik</h1>
    <p>A curated browser games portal. Site under construction.</p>
  </main>
</BaseLayout>
```

- [ ] **Step 4: Verify build**

```bash
npm run build
grep -c '<link rel="canonical"' dist/index.html
grep -c '<meta name="description"' dist/index.html
```

Expected: both `grep` commands output `1`. Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/styles/global.css src/pages/index.astro
git commit -m "feat: add BaseLayout with canonical + meta"
```

---

## Task 8: ConsentBanner island

**Files:**
- Create: `src/components/ConsentBanner.astro`
- Modify: `src/layouts/BaseLayout.astro` (mount the banner)

The banner is a client-hydrated Astro component. On first render it reads consent state; if `null`, it shows the banner. Buttons call the accept/reject logic from `src/lib/consent.ts`. Critically, this component does **not** load GTM — Task 9 does. This task just manages consent state and notifies a custom event so Task 9 can subscribe.

- [ ] **Step 1: Create `src/components/ConsentBanner.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/components/ConsentBanner.astro`:

```astro
---
// Server-side: render the banner markup hidden by default. Client script decides whether to show.
---
<div id="kloopik-consent-banner" class="consent-banner" hidden role="dialog" aria-labelledby="consent-title" aria-describedby="consent-body">
  <p id="consent-title" class="consent-title">Cookies & tracking</p>
  <p id="consent-body" class="consent-body">
    We use Google Analytics to understand traffic, and GameMonetize serves game embeds that may use cookies for ads.
    You can accept or reject these. Essential site traffic is counted cookielessly via Cloudflare and is not affected.
  </p>
  <div class="consent-actions">
    <button type="button" id="kloopik-consent-reject" class="consent-btn consent-btn-secondary">Reject</button>
    <button type="button" id="kloopik-consent-accept" class="consent-btn consent-btn-primary">Accept</button>
  </div>
</div>

<style>
  .consent-banner {
    position: fixed;
    inset-inline: 1rem;
    inset-block-end: 1rem;
    max-width: 32rem;
    margin-inline: auto;
    padding: 1rem 1.25rem;
    background: #111;
    color: #f5f5f5;
    border-radius: 0.5rem;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    font-size: 0.9rem;
    z-index: 10000;
  }
  .consent-title { margin: 0 0 0.25rem; font-weight: 600; }
  .consent-body { margin: 0 0 0.75rem; line-height: 1.4; }
  .consent-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .consent-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: 1px solid transparent;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .consent-btn-primary { background: #f5f5f5; color: #111; }
  .consent-btn-secondary { background: transparent; color: #f5f5f5; border-color: rgba(255,255,255,0.4); }
</style>

<script>
  import {
    loadConsent,
    saveConsent,
    ACCEPT_ALL,
    REJECT_ALL,
    toGtagConsentUpdate,
    type ConsentState,
  } from '../lib/consent';

  const CONSENT_EVENT = 'kloopik:consent-changed';

  function applyConsent(state: ConsentState) {
    saveConsent(state);
    const update = toGtagConsentUpdate(state);
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: 'consent_update', ...update });
    // Also call gtag directly (Consent Mode v2 requires this API shape)
    if (typeof w.gtag === 'function') {
      w.gtag('consent', 'update', update);
    }
    document.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
    hideBanner();
  }

  function showBanner() {
    document.getElementById('kloopik-consent-banner')?.removeAttribute('hidden');
  }

  function hideBanner() {
    document.getElementById('kloopik-consent-banner')?.setAttribute('hidden', '');
  }

  function init() {
    const existing = loadConsent();
    if (existing === null) {
      showBanner();
    }
    document.getElementById('kloopik-consent-accept')?.addEventListener('click', () => applyConsent(ACCEPT_ALL));
    document.getElementById('kloopik-consent-reject')?.addEventListener('click', () => applyConsent(REJECT_ALL));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
</script>
```

- [ ] **Step 2: Mount the banner in BaseLayout**

Replace `/Users/egalvans/Downloads/Head/Claude/portal/src/layouts/BaseLayout.astro`:

```astro
---
import '../styles/global.css';
import ConsentBanner from '../components/ConsentBanner.astro';

interface Props {
  title: string;
  description?: string;
  canonicalPath?: string;
}

const { title, description, canonicalPath } = Astro.props;
const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const canonical = canonicalPath ? `${siteUrl}${canonicalPath}` : `${siteUrl}${Astro.url.pathname}`;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="robots" content="index,follow" />
  </head>
  <body>
    <slot />
    <ConsentBanner />
  </body>
</html>
```

- [ ] **Step 3: Verify build**

```bash
npm run build
grep -c 'kloopik-consent-banner' dist/index.html
```

Expected: `1` (the banner markup is present in the built HTML).

- [ ] **Step 4: Verify in dev server**

```bash
npm run dev
```

1. Open `http://localhost:4321/` in a private window.
2. See the consent banner at the bottom.
3. Open DevTools → Application → Local Storage → `http://localhost:4321` — confirm no `kloopik.consent.v1` key.
4. Click "Reject". Banner disappears. LocalStorage now has `kloopik.consent.v1: {"analytics":false,"ads":false}`.
5. Reload. Banner does not reappear.
6. Clear localStorage. Reload. Banner reappears. Click "Accept". LocalStorage has `{"analytics":true,"ads":true}`.

Stop dev server with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/components/ConsentBanner.astro src/layouts/BaseLayout.astro
git commit -m "feat: add consent banner island with localStorage persistence"
```

---

## Task 9: Wire GTM + Consent Mode v2 defaults into BaseLayout

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

GTM loads with all consent categories `denied` by default. If the user has already accepted in a previous session, `gtag('consent', 'update', ...)` fires before the GTM script starts. This matches the Consent Mode v2 advanced pattern.

The order of things in `<head>`:

1. Initialize `dataLayer` and `gtag` stub.
2. Push default consent: `denied`.
3. If `loadConsent()` returns accepted state, push update to `granted` (pre-GTM, so GA4 tags fire correctly with the granted state on first pageview).
4. Load GTM asynchronously.

- [ ] **Step 1: Replace `src/layouts/BaseLayout.astro` with GTM wiring**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/layouts/BaseLayout.astro`:

```astro
---
import '../styles/global.css';
import ConsentBanner from '../components/ConsentBanner.astro';

interface Props {
  title: string;
  description?: string;
  canonicalPath?: string;
}

const { title, description, canonicalPath } = Astro.props;
const siteUrl = import.meta.env.PUBLIC_SITE_URL;
const gtmId = import.meta.env.PUBLIC_GTM_ID;
const canonical = canonicalPath ? `${siteUrl}${canonicalPath}` : `${siteUrl}${Astro.url.pathname}`;

const shouldLoadGtm = typeof gtmId === 'string' && gtmId.startsWith('GTM-');
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    <link rel="canonical" href={canonical} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="robots" content="index,follow" />

    {shouldLoadGtm && (
      <>
        {/* Consent Mode v2: default denied, then pre-GTM update from stored state */}
        <script is:inline>
          window.dataLayer = window.dataLayer || [];
          function gtag(){ dataLayer.push(arguments); }
          window.gtag = gtag;

          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });

          try {
            var raw = localStorage.getItem('kloopik.consent.v1');
            if (raw) {
              var parsed = JSON.parse(raw);
              if (parsed && typeof parsed.analytics === 'boolean' && typeof parsed.ads === 'boolean') {
                gtag('consent', 'update', {
                  analytics_storage: parsed.analytics ? 'granted' : 'denied',
                  ad_storage: parsed.ads ? 'granted' : 'denied',
                  ad_user_data: parsed.ads ? 'granted' : 'denied',
                  ad_personalization: parsed.ads ? 'granted' : 'denied'
                });
              }
            }
          } catch (_) { /* no-op */ }

          gtag('js', new Date());
        </script>
        {/* GTM loader */}
        <script is:inline defer src={`https://www.googletagmanager.com/gtm.js?id=${gtmId}`}></script>
      </>
    )}
  </head>
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
    <slot />
    <ConsentBanner />
  </body>
</html>
```

Note: We use `is:inline` on the consent default script so Astro doesn't bundle it — it must run **before** GTM loads, and bundling it into a module can reorder execution.

- [ ] **Step 2: Create `.env.local` with a test GTM ID**

Run:

```bash
cat > .env.local <<'EOF'
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_GTM_ID=GTM-TESTTEST
PUBLIC_GA4_ID=G-TESTTESTTE
PUBLIC_CF_ANALYTICS_TOKEN=00000000000000000000000000000000
EOF
```

- [ ] **Step 3: Verify build includes GTM when env var is set**

```bash
npm run build
grep -c 'googletagmanager.com/gtm.js' dist/index.html
grep -c "consent.*default" dist/index.html
grep -c "GTM-TESTTEST" dist/index.html
```

Expected: all three `1` or more. Build succeeds.

- [ ] **Step 4: Verify build omits GTM when env var is placeholder**

```bash
# Test the fallback: unset the GTM env var
PUBLIC_GTM_ID= npm run build
grep -c 'googletagmanager.com/gtm.js' dist/index.html || echo "0 matches (expected)"
```

Expected: `0 matches (expected)`. Build still succeeds.

Restore the test env by re-running `npm run build` with `.env.local` in place.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro .env.example
git commit -m "feat: wire GTM with consent mode v2 advanced defaults"
```

---

## Task 10: Wire Cloudflare Web Analytics

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

CF Web Analytics is cookieless, so it runs unconditionally — no consent check needed. It goes at the end of `<body>` to minimize impact on page load.

- [ ] **Step 1: Add the CF beacon to BaseLayout**

Edit `/Users/egalvans/Downloads/Head/Claude/portal/src/layouts/BaseLayout.astro` — find the `<slot />` + `<ConsentBanner />` block in `<body>` and replace with:

```astro
    <slot />
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
```

The regex ensures placeholder tokens (`00000000...`) don't load the beacon during local dev or when env is missing.

- [ ] **Step 2: Verify build with a real-shaped token**

```bash
# Use a syntactically valid but fake token
PUBLIC_CF_ANALYTICS_TOKEN=abcdef0123456789abcdef0123456789 npm run build
grep -c 'cloudflareinsights.com/beacon' dist/index.html
```

Expected: `1`.

- [ ] **Step 3: Verify build with the placeholder token**

```bash
# .env.local has PUBLIC_CF_ANALYTICS_TOKEN=0000...000 — should NOT emit beacon
npm run build
grep -c 'cloudflareinsights.com/beacon' dist/index.html || echo "0 (expected)"
```

Expected: `0 (expected)`.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: wire cloudflare web analytics beacon"
```

---

## Task 11: 404 page and temporary robots.txt

**Files:**
- Create: `src/pages/404.astro`
- Create: `public/robots.txt`

- [ ] **Step 1: Create `src/pages/404.astro`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/pages/404.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Page not found — Kloopik" description="The page you were looking for doesn't exist.">
  <main style="max-width: 40rem; margin: 4rem auto; padding: 1rem; text-align: center;">
    <h1 style="font-size: 3rem; margin: 0 0 1rem;">404</h1>
    <p>That page doesn't exist.</p>
    <p><a href="/">Go home</a></p>
  </main>
</BaseLayout>
```

- [ ] **Step 2: Create `public/robots.txt`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/public/robots.txt`:

```
User-agent: *
Allow: /

Sitemap: https://www.kloopik.com/sitemap-index.xml
```

Note: `sitemap-index.xml` doesn't exist yet — Plan 2 creates it. Listing it here is intentional so that once Plan 2 ships, crawlers already have the hint. Missing sitemaps aren't a crawl error; empty references just get re-checked.

- [ ] **Step 3: Verify build**

```bash
npm run build
cat dist/404.html | head -20
cat dist/robots.txt
```

Expected: both files exist, contain the content written.

- [ ] **Step 4: Commit**

```bash
git add src/pages/404.astro public/robots.txt
git commit -m "feat: add 404 page and temporary robots.txt"
```

---

## Task 12: Empty content collections wired up

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/games/.gitkeep`
- Create: `src/content/blog/.gitkeep`

Wire Zod schemas now (even with no content), so Plan 2 can start dropping markdown files without touching config.

- [ ] **Step 1: Create `src/content/config.ts`**

Write `/Users/egalvans/Downloads/Head/Claude/portal/src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';

// Minimal skeletal schemas. Plan 2 expands these with all fields from the spec.
// Keeping them minimal here so the build passes even with no content.
const gamesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    draft: z.boolean().default(true),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    publishedAt: z.date(),
    draft: z.boolean().default(true),
  }),
});

export const collections = {
  games: gamesCollection,
  blog: blogCollection,
};
```

- [ ] **Step 2: Keep the directories in git**

```bash
mkdir -p src/content/games src/content/blog
touch src/content/games/.gitkeep src/content/blog/.gitkeep
```

- [ ] **Step 3: Verify build still works**

```bash
npm run build
```

Expected: build succeeds. Astro may log `Watching for collection changes` but no errors.

- [ ] **Step 4: Commit**

```bash
git add src/content/
git commit -m "feat: wire empty content collections with zod schemas"
```

---

## Task 13: Polish — astro check + final build

**Files:** none (verification only)

- [ ] **Step 1: Run astro check**

```bash
npm run check
```

Expected: `0 errors, 0 warnings`. If TypeScript complains about any of our added code, fix it inline. Do not claim this task done if there are errors.

- [ ] **Step 2: Run all tests**

```bash
npm run test
```

Expected: all unit tests pass.

- [ ] **Step 3: Final production build**

```bash
rm -rf dist
npm run build
```

Expected: build succeeds. `dist/` contains `index.html`, `404.html`, `favicon.svg`, `robots.txt`.

- [ ] **Step 4: Quick visual audit**

```bash
npm run preview
```

Visit `http://localhost:4321/` and `http://localhost:4321/nonexistent-page` — verify consent banner appears, home renders, 404 renders. Stop with Ctrl+C.

- [ ] **Step 5: Commit any fixes**

If Step 1/2/3 required fixes, commit them:

```bash
git status
git add -A
git commit -m "chore: fix astro check + test issues from plan 1 polish pass"
```

If nothing needed fixing, no commit needed.

---

## Task 14: Push to main

**Files:** none (git operation)

⚠️ **Confirm with user before running this task.** The push deploys to production via CF Pages.

- [ ] **Step 1: Verify branch and working tree**

```bash
git status
git log --oneline -10
```

Expected: on `main`, working tree clean.

- [ ] **Step 2: Push**

Only after user confirmation:

```bash
git push origin main
```

- [ ] **Step 3: Wait for CF Pages build**

Visit `https://dash.cloudflare.com/` → Pages → `kloopik` → Deployments. The latest deployment should show "Building" → "Success".

If the deployment fails because the CF Pages project still expects the old Eleventy build command, this is resolved in Task 15.

---

## Task 15: Configure the CF Pages project for the new stack

**Files:** none (CF dashboard actions + one config check)

- [ ] **Step 1: Update build settings in the CF dashboard**

Pages → `kloopik` → Settings → Build & deployments:

- Framework preset: `Astro`
- Build command: `npm run build`
- Build output directory: `dist` (not the old `_site`)
- Root directory: `/` (repo root)
- Node version: set env var `NODE_VERSION = 20`

Save and trigger a new deployment (either push an empty commit or "Retry deployment" from the latest).

- [ ] **Step 2: Set production environment variables**

Pages → `kloopik` → Settings → Environment variables → Production:

Add four variables (values from Task 2 Step 3):
- `PUBLIC_SITE_URL = https://www.kloopik.com`
- `PUBLIC_GTM_ID = GTM-<your-real-id>`
- `PUBLIC_GA4_ID = G-<your-real-id>`
- `PUBLIC_CF_ANALYTICS_TOKEN = <your-real-32-char-token>`

Mark as "Plaintext" — these are public by design.

Re-deploy after adding env vars (they only apply on the next build).

- [ ] **Step 3: Verify production site**

Visit `https://www.kloopik.com` in a private window. Confirm:
1. The "Kloopik — Coming soon" page renders.
2. Consent banner appears at the bottom.
3. View source: contains `<script … googletagmanager.com/gtm.js?id=GTM-…>` and `<script … cloudflareinsights.com/beacon.min.js`.
4. Network tab: `beacon.min.js` and `gtm.js` both load (once GTM container is published — it may 404 until then, which is fine).

Also verify:
- `https://kloopik.com` redirects 301 → `https://www.kloopik.com`
- `https://www.kloopik.com/nonexistent` renders the 404 page

- [ ] **Step 4: Verify GA4 receives a hit after consent accept**

In GA4 → Reports → Realtime: click "Accept" on the banner, reload the site. A hit should appear in Realtime within 10–30 seconds.

If no hit appears: check GTM container is published and the GA4 tag is active in GTM; check `Accept` correctly updates consent in the browser's DevTools (Application → Local Storage → `kloopik.consent.v1`).

- [ ] **Step 5: Verify CF Web Analytics receives a hit regardless**

CF dashboard → Analytics & Logs → Web Analytics → `kloopik`. Should show one pageview within 1–2 minutes of visiting.

---

## Plan 1 exit criteria

- Repo contains only: docs, CNAME, minimal Astro scaffold, no old Eleventy source.
- Production `https://www.kloopik.com` serves an Astro-built page with consent banner, GTM wired, CF Web Analytics wired.
- Accepting the banner surfaces hits in GA4 realtime.
- Rejecting the banner leaves no GA4 cookies in the browser.
- `npm run check`, `npm run test`, `npm run build` all green locally.
- Clerk org deleted, D1 database deleted.

Plan 2 (Content & Routes) picks up from this empty-but-wired scaffold.
