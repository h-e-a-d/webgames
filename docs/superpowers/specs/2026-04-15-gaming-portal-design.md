# HTML5 Gaming Portal — Design Spec
**Date:** 2026-04-15  
**Status:** Approved

---

## 1. Overview

An HTML5 gaming portal where all games are built in-house by the owner. The portal serves as a catalog and launcher; each game is a self-contained iframe. Monetisation is via Google AdSense for Games (pre-roll and interstitial ads called from within each game's iframe). Users can create accounts to save game progress.

**Goals:**
- Maximise SEO via static HTML output
- Simple, scalable architecture that makes adding new games fast
- Full isolation between portal code and game code
- Ad revenue via AdSense for Games (managed inside each game, not the portal shell)
- User accounts for save-state persistence only (no leaderboards, no achievements at launch)

---

## 2. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Portal frontend | Eleventy (11ty) → static HTML/CSS/JS | Pure HTML output (identical SEO to hand-written HTML), templating for 100s of game pages, zero client-side framework overhead |
| Hosting & CDN | Cloudflare Pages | Free tier generous, global CDN, git-push deploy |
| Serverless API | Cloudflare Pages Functions (Workers) | Co-located with hosting, no separate server, D1 binding built-in |
| Database | Cloudflare D1 (SQLite) | Serverless, free tier (5GB / 5M rows/day), sufficient for save states |
| Auth | Clerk | Handles Google OAuth + email/password, free up to 10k MAU, JS SDK works with static sites |
| Games | Pure HTML5 Canvas + vanilla JS | No framework dependency, maximum control, runs standalone in an iframe |
| Ads | Google AdSense for Games SDK | Called from within each game's iframe — pre-roll on load, interstitial on game-over/level-complete |

---

## 3. Architecture

```
┌──────────────────────────────────────────────────────┐
│  Cloudflare Pages (CDN — global edge)                │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Eleventy → Static HTML/CSS/JS               │   │
│  │  • /                  Homepage               │   │
│  │  • /games/[slug]/     Game detail shell      │   │
│  │  • /account/          Saved progress page    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  /games/[slug]/game.html  (iframe target)    │   │
│  │  Standalone HTML5 Canvas games               │   │
│  │  AdSense for Games SDK called from here      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Pages Functions (Workers)                   │   │
│  │  /api/saves/[slug]  GET / PUT / DELETE       │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌────────────────┐   ┌────────────────┐            │
│  │ Cloudflare D1  │   │ Clerk (Auth)   │            │
│  │ (save states)  │   │ Google OAuth   │            │
│  └────────────────┘   └────────────────┘            │
└──────────────────────────────────────────────────────┘
```

### Key architectural decisions

- **Iframe isolation:** Each game lives at `/games/[slug]/game.html` and is loaded in an `<iframe>` on the detail page. Game JS is fully isolated from portal JS. A broken game cannot crash the portal.
- **postMessage for save handoff:** The game sends `postMessage({ type: 'save', data: {...} })` to the parent shell. The shell holds the Clerk session token and makes the authenticated API call. The game never touches auth.
- **Load flow:** On game page load, the shell fetches existing save data from the API and posts it into the iframe before gameplay begins.
- **Ad isolation:** All AdSense for Games calls happen inside the game iframe. The portal shell has zero ad code.

---

## 4. Homepage Layout

CrazyGames-style layout:

- **Left sidebar** — logo, Home / Popular / New / Random links, category list (Arcade, Puzzle, Card, Action, Strategy, Runner, Sports, Shooting). Expands on homepage, collapses to icon-only on game detail pages.
- **Top bar** — search field, Sign In button (Clerk)
- **Main content** — curated horizontal rows:
  - Top picks for you (5 large cards)
  - Featured games (6 medium cards)
  - New games (6 medium cards, NEW badge)
  - Per-category rows added as catalog grows
- **No ads on the homepage or portal shell.** Interstitials and pre-rolls are managed entirely within each game's iframe.

---

## 5. Game Detail Page Layout

- Sidebar collapses to icon-only to maximise game area
- Breadcrumb: Home / Category / Game Name
- **Game iframe** — 4:3 aspect ratio, black background, fullscreen button overlay
- **Controls bar** below iframe — Restart button, keyboard hint. No manual save button — progress is saved automatically by the game.
- **Game info** below controls — title, category, rating, play count, description
- **Related games** right sidebar — 4 games from same category
- No ads on the portal shell. AdSense pre-roll fires when `game.html` loads; interstitials fire on game-over or level-complete from within the iframe.

---

## 6. Save Progress Flow

Progress is saved **automatically** — the game triggers saves without any user action. There is no manual save button.

### Auto-save triggers (defined per game, examples)
- On level complete
- On checkpoint reached
- On game over
- On periodic interval (e.g. every 30 seconds for continuous games)

### Protocol

```
Game iframe                      Portal shell (parent)        Cloudflare Workers + D1
───────────                      ─────────────────────        ───────────────────────

── AUTO-SAVE (game-triggered) ──────────────────────────────────────────────────────
Game hits a save trigger
(level complete, checkpoint,
 game over, 30s interval)

postMessage({                    addEventListener('message', (e) => {
  type: 'save',          ──►       if (e.data.type === 'save') {
  data: { level: 3,                  fetch('/api/saves/snake', {
          score: 1200 }                method: 'PUT',
})                                     headers: { Authorization: clerkToken },
                                       body: JSON.stringify(e.data.data)
                                     })                ──►    Upsert into D1
                                  }
                                })

── LOAD SAVE (on page load) ────────────────────────────────────────────────────────
Shell loads, user is logged in   fetch('/api/saves/snake')
                         ◄──     → returns save_data (or null)

                                 iframe.contentWindow.postMessage({
                                   type: 'load-save',     ──►    Game restores state
                                   data: { level: 3,              from received data
                                           score: 1200 }
                                 })
```

### Game SDK contract (what every game must implement)

Each `game.html` must listen for `load-save` and fire `save` at the appropriate moments:

```js
// Receive saved state on load
window.addEventListener('message', (e) => {
  if (e.data.type === 'load-save') {
    restoreGameState(e.data.data); // game-defined function
  }
});

// Send save at trigger points
function autoSave() {
  parent.postMessage({
    type: 'save',
    data: getCurrentGameState() // game-defined function
  }, '*');
}

// Call autoSave() on: level complete, checkpoint, game over, setInterval
```

This contract is pre-wired in `_game-template.html` so every new game has it from the start.

---

## 7. Data Model

```sql
CREATE TABLE game_saves (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL,       -- Clerk user ID (e.g. "user_2abc...")
  game_slug   TEXT NOT NULL,       -- e.g. "snake", "breakout"
  save_data   TEXT NOT NULL,       -- JSON blob, shape defined per game
  updated_at  INTEGER NOT NULL,    -- Unix timestamp
  UNIQUE(user_id, game_slug)       -- one save per user per game (upsert)
);
```

`save_data` is a free-form JSON blob. Each game defines its own structure. The API stores and returns it opaquely.

---

## 8. API Endpoints

All endpoints require a valid Clerk session token in the `Authorization: Bearer <token>` header. Unauthenticated requests return 401.

| Method | Path | Description |
|---|---|---|
| GET | `/api/saves/:slug` | Return user's save for this game, or `null` if none |
| PUT | `/api/saves/:slug` | Upsert save data (body: `{ data: {...} }`) |
| DELETE | `/api/saves/:slug` | Clear save (reset progress) |

---

## 9. Game Catalog Data

Each game is defined in `src/_data/games.json`:

```json
[
  {
    "slug": "snake",
    "title": "Snake",
    "category": "arcade",
    "description": "Classic snake game. Eat food, grow longer, don't hit the walls.",
    "thumbnail": "/public/thumbnails/snake.jpg",
    "controls": "WASD / Arrow keys",
    "rating": 4.7,
    "new": false
  }
]
```

Adding a new game: add folder to `/games/`, add entry to `games.json`. Eleventy auto-generates the detail page.

---

## 10. File Structure

```
portal/
├── .eleventy.js                    # Eleventy config
├── package.json
├── src/
│   ├── index.njk                   # Homepage
│   ├── games/
│   │   └── [slug].njk              # Game detail page template
│   ├── _data/
│   │   └── games.json              # Game catalog
│   ├── _includes/
│   │   ├── base.njk                # Base layout (sidebar, head, Clerk script)
│   │   └── game-shell.njk          # Iframe shell component
│   ├── css/
│   │   └── main.css
│   └── js/
│       ├── portal.js               # Category filtering, sidebar toggle
│       └── shell.js                # postMessage listener, save API calls
├── games/                          # Game files (not processed by Eleventy)
│   ├── snake/
│   │   └── game.html               # Standalone canvas game + AdSense SDK
│   ├── breakout/
│   │   └── game.html
│   └── _game-template.html         # Starter template for new games
├── functions/                      # Cloudflare Pages Functions
│   └── api/
│       └── saves/
│           └── [slug].js           # GET / PUT / DELETE save handler
└── public/
    └── thumbnails/                 # Game card images
```

---

## 11. SEO Strategy

- Eleventy outputs pure static HTML — no client-side rendering, fully crawlable
- Each game gets its own URL (`/games/snake/`) with unique `<title>`, `<meta description>`, Open Graph tags, and JSON-LD `VideoGame` structured data generated from `games.json`
- Homepage uses semantic HTML with proper heading hierarchy
- Sitemap auto-generated by Eleventy sitemap plugin
- Fast load times from Cloudflare CDN edge — good Core Web Vitals baseline

---

## 12. Ad Integration (per game)

Each `game.html` integrates AdSense for Games independently:

```html
<!-- In each game.html <head> -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>

<script>
  // Pre-roll: call before game loop starts
  function showPreRoll() { /* AdSense Games API call */ }

  // Interstitial: call on game-over or level-complete
  function showInterstitial() { /* AdSense Games API call */ }
</script>
```

The `_game-template.html` starter includes these stubs so every new game has the hooks in place from the start.

---

## 13. Out of Scope (v1)

- Leaderboards
- Achievements / badges
- User profiles / avatars
- Comments / ratings (stored server-side)
- Game editor or CMS
- Mobile app
