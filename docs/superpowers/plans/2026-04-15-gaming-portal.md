# Gaming Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack HTML5 gaming portal with Eleventy (static frontend), Cloudflare Pages + Workers + D1 (backend), Clerk (auth), and a reusable game template with AdSense for Games and auto-save via postMessage.

**Architecture:** Eleventy generates pure static HTML for the portal. Each game lives as a standalone `game.html` (iframe target) with AdSense and auto-save baked in via a shared contract. The portal shell (parent page) holds the Clerk session and proxies save calls to a Cloudflare Worker that writes to D1.

**Tech Stack:** Eleventy 3, Nunjucks, plain CSS/JS, Cloudflare Pages, Cloudflare Workers (Pages Functions), Cloudflare D1, Clerk JS (vanilla), Google AdSense for Games

---

## File Map

```
portal/
├── .eleventy.js                        # Eleventy config + passthrough rules
├── package.json                        # Eleventy + dev deps
├── wrangler.toml                       # Cloudflare Pages / D1 binding config
├── src/
│   ├── index.njk                       # Homepage (sidebar + curated rows)
│   ├── games/
│   │   └── [slug].njk                  # Game detail shell (iframe + controls)
│   ├── _data/
│   │   └── games.json                  # Game catalog (slug, title, category, ...)
│   ├── _includes/
│   │   ├── base.njk                    # Base layout (head, sidebar, top bar, Clerk)
│   │   └── game-shell.njk             # Reusable iframe + controls component
│   ├── css/
│   │   └── main.css                    # All styles (design tokens → components)
│   └── js/
│       ├── portal.js                   # Category filtering, sidebar toggle
│       └── shell.js                   # postMessage listener + save API calls
├── games/
│   ├── _game-template.html             # Starter for new games (canvas + AdSense + SDK)
│   └── snake/
│       └── game.html                   # First game: Snake
├── functions/
│   └── api/
│       └── saves/
│           └── [slug].js              # GET / PUT / DELETE save handler (Worker)
└── public/
    └── thumbnails/                     # Game card images (slug.jpg)
```

---

## Phase 1 — Project Scaffold

### Task 1: Initialize project

**Files:**
- Create: `package.json`
- Create: `.eleventy.js`
- Create: `.gitignore`
- Create directory structure

- [ ] **Step 1: Create package.json**

```json
{
  "name": "gaming-portal",
  "version": "1.0.0",
  "scripts": {
    "dev": "eleventy --serve",
    "build": "eleventy",
    "preview": "wrangler pages dev _site --compatibility-date=2024-01-01"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0",
    "wrangler": "^3.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create .eleventy.js**

```js
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("games");
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
  };
};
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
_site/
.wrangler/
.env
.env.local
.superpowers/
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p src/_includes src/_data src/games src/css src/js
mkdir -p games/snake
mkdir -p functions/api/saves
mkdir -p public/thumbnails
```

- [ ] **Step 6: Create minimal src/index.njk to verify build**

```njk
---
title: Gaming Portal
---
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>{{ title }}</title></head>
<body><h1>Portal works</h1></body>
</html>
```

- [ ] **Step 7: Run build and verify**

```bash
npm run dev
```

Expected: Eleventy starts on `http://localhost:8080`, browser shows "Portal works".

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: project scaffold — Eleventy 3 + Cloudflare wrangler setup"
```

---

## Phase 2 — Portal UI

### Task 2: CSS design system

**Files:**
- Create: `src/css/main.css`

- [ ] **Step 1: Write main.css with design tokens and base styles**

```css
/* ── Design Tokens ─────────────────────────────────────────────── */
:root {
  --bg-base:       #0a0a0f;
  --bg-surface:    #0f0f18;
  --bg-raised:     #1a1a2e;
  --bg-hover:      #22223a;
  --border:        #1a1a2e;
  --text-primary:  #ffffff;
  --text-secondary:#888888;
  --text-muted:    #444444;
  --accent:        #5c5cff;
  --accent-hover:  #7070ff;
  --radius-sm:     6px;
  --radius-md:     8px;
  --radius-lg:     10px;
  --sidebar-w:     200px;
  --sidebar-w-collapsed: 52px;
  --topbar-h:      48px;
}

/* ── Reset ──────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  min-height: 100vh;
  display: flex;
}

/* ── Layout shell ───────────────────────────────────────────────── */
.layout { display: flex; width: 100%; min-height: 100vh; }

/* ── Sidebar ────────────────────────────────────────────────────── */
.sidebar {
  width: var(--sidebar-w);
  min-width: var(--sidebar-w);
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  overflow-y: auto;
  z-index: 100;
  transition: width 0.2s, min-width 0.2s;
}
.sidebar.collapsed {
  width: var(--sidebar-w-collapsed);
  min-width: var(--sidebar-w-collapsed);
}
.sidebar .logo {
  padding: 0 16px 16px;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 2px;
  color: var(--text-primary);
  text-decoration: none;
  display: block;
  overflow: hidden;
  white-space: nowrap;
}
.sidebar.collapsed .logo { font-size: 13px; text-align: center; padding: 0 0 16px; }
.sidebar nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-sm);
  margin: 0 8px 2px;
  white-space: nowrap;
  overflow: hidden;
  font-size: 13px;
  transition: background 0.15s, color 0.15s;
}
.sidebar nav a:hover, .sidebar nav a.active {
  background: var(--bg-raised);
  color: var(--text-primary);
}
.sidebar nav a .icon { font-size: 16px; flex-shrink: 0; }
.sidebar.collapsed nav a .label { display: none; }
.sidebar .section-label {
  padding: 12px 16px 4px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
}
.sidebar.collapsed .section-label { opacity: 0; height: 0; padding: 0; }
.sidebar hr { border: none; border-top: 1px solid var(--border); margin: 8px 16px; }

/* ── Main area ──────────────────────────────────────────────────── */
.main {
  flex: 1;
  margin-left: var(--sidebar-w);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: margin-left 0.2s;
}
.main.sidebar-collapsed { margin-left: var(--sidebar-w-collapsed); }

/* ── Top bar ────────────────────────────────────────────────────── */
.topbar {
  height: var(--topbar-h);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 99;
}
.topbar .search {
  flex: 1;
  max-width: 480px;
  background: var(--bg-raised);
  border: none;
  border-radius: 20px;
  padding: 7px 14px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}
.topbar .search::placeholder { color: var(--text-muted); }
.topbar .btn-signin {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}
.topbar .btn-signin:hover { background: var(--accent-hover); }
.topbar .user-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }

/* ── Page content ───────────────────────────────────────────────── */
.content { flex: 1; padding: 24px 20px; }

/* ── Section row ────────────────────────────────────────────────── */
.row { margin-bottom: 28px; }
.row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.row-header h2 { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.row-header a { color: var(--accent); font-size: 12px; text-decoration: none; }
.row-header a:hover { text-decoration: underline; }
.badge-new {
  background: var(--accent);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

/* ── Game grid ──────────────────────────────────────────────────── */
.games-grid { display: grid; gap: 10px; }
.games-grid.large  { grid-template-columns: repeat(5, 1fr); }
.games-grid.medium { grid-template-columns: repeat(6, 1fr); }
@media (max-width: 1100px) {
  .games-grid.large  { grid-template-columns: repeat(4, 1fr); }
  .games-grid.medium { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 768px) {
  .games-grid.large, .games-grid.medium { grid-template-columns: repeat(3, 1fr); }
  .sidebar { display: none; }
  .main { margin-left: 0 !important; }
}

/* ── Game card ──────────────────────────────────────────────────── */
.game-card {
  background: var(--bg-raised);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: transform 0.15s, background 0.15s;
}
.game-card:hover { transform: translateY(-2px); background: var(--bg-hover); }
.game-card .thumb {
  aspect-ratio: 4/3;
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.game-card .thumb img { width: 100%; height: 100%; object-fit: cover; }
.game-card .thumb .emoji { font-size: 36px; }
.game-card .info { padding: 8px 10px 10px; }
.game-card .info .title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.game-card .info .cat   { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

/* ── Game detail page ───────────────────────────────────────────── */
.game-page { display: flex; gap: 0; flex: 1; }
.game-area { flex: 1; padding: 16px; display: flex; flex-direction: column; min-width: 0; }
.breadcrumb { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
.breadcrumb a { color: var(--text-muted); text-decoration: none; }
.breadcrumb a:hover { color: var(--text-secondary); }
.game-frame-wrap {
  background: #000;
  border-radius: var(--radius-lg);
  aspect-ratio: 4/3;
  max-height: calc(100vh - 180px);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
}
.game-frame-wrap iframe {
  width: 100%; height: 100%;
  border: none;
  display: block;
}
.game-frame-wrap .btn-fullscreen {
  position: absolute;
  bottom: 10px; right: 10px;
  background: rgba(255,255,255,0.08);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.game-frame-wrap .btn-fullscreen:hover { background: rgba(255,255,255,0.16); }
.game-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.btn-secondary {
  background: var(--bg-raised);
  color: var(--text-primary);
  border: none;
  border-radius: var(--radius-sm);
  padding: 7px 14px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-secondary:hover { background: var(--bg-hover); }
.controls-hint { margin-left: auto; font-size: 11px; color: var(--text-muted); }
.game-info { margin-top: 14px; }
.game-info h1 { font-size: 18px; font-weight: 700; }
.game-info .meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.game-info .desc { font-size: 13px; color: var(--text-secondary); margin-top: 8px; line-height: 1.6; }
.game-sidebar {
  width: 160px;
  min-width: 160px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  padding: 16px 12px;
}
.game-sidebar h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 10px; }
.related-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-raised);
  border-radius: var(--radius-md);
  padding: 8px;
  margin-bottom: 8px;
  text-decoration: none;
  color: inherit;
  transition: background 0.15s;
}
.related-card:hover { background: var(--bg-hover); }
.related-card .emoji { font-size: 22px; }
.related-card .rtitle { font-size: 11px; font-weight: 600; }
.related-card .rcat   { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }

/* ── Utility ────────────────────────────────────────────────────── */
.hidden { display: none !important; }
```

- [ ] **Step 2: Verify CSS is valid (no obvious syntax errors)**

Open `src/css/main.css` in editor, check for unclosed braces. No build step needed.

- [ ] **Step 3: Commit**

```bash
git add src/css/main.css
git commit -m "feat: CSS design system — tokens, layout, cards, game detail"
```

---

### Task 3: Base layout template

**Files:**
- Create: `src/_includes/base.njk`

- [ ] **Step 1: Create base.njk**

```njk
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title }} | GamePortal</title>
  {% if description %}
  <meta name="description" content="{{ description }}">
  {% endif %}
  <link rel="stylesheet" href="/css/main.css">
  <!-- Clerk auth -->
  <script src="https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js" crossorigin="anonymous"></script>
</head>
<body>
<div class="layout">

  <!-- Sidebar -->
  <aside class="sidebar {% if collapsedSidebar %}collapsed{% endif %}" id="sidebar">
    <a href="/" class="logo">GAMEPORTAL</a>
    <nav>
      <a href="/" class="{% if page.url == '/' %}active{% endif %}">
        <span class="icon">🏠</span><span class="label">Home</span>
      </a>
      <a href="/popular/"><span class="icon">🔥</span><span class="label">Popular</span></a>
      <a href="/new/"><span class="icon">⭐</span><span class="label">New</span></a>
      <a href="/random/"><span class="icon">🎲</span><span class="label">Random</span></a>
    </nav>
    <hr>
    <div class="section-label">Categories</div>
    <nav>
      <a href="/category/arcade/"><span class="icon">🕹️</span><span class="label">Arcade</span></a>
      <a href="/category/puzzle/"><span class="icon">🧩</span><span class="label">Puzzle</span></a>
      <a href="/category/card/"><span class="icon">🃏</span><span class="label">Card</span></a>
      <a href="/category/action/"><span class="icon">⚔️</span><span class="label">Action</span></a>
      <a href="/category/strategy/"><span class="icon">♟️</span><span class="label">Strategy</span></a>
      <a href="/category/runner/"><span class="icon">🏃</span><span class="label">Runner</span></a>
      <a href="/category/sports/"><span class="icon">⚽</span><span class="label">Sports</span></a>
      <a href="/category/shooting/"><span class="icon">🎯</span><span class="label">Shooting</span></a>
    </nav>
  </aside>

  <!-- Main -->
  <div class="main {% if collapsedSidebar %}sidebar-collapsed{% endif %}" id="main">

    <!-- Top bar -->
    <header class="topbar">
      <input class="search" type="search" placeholder="🔍  Search games..." id="search-input">
      <!-- Auth slots (toggled by clerk.js) -->
      <div id="auth-signed-out" class="hidden">
        <button class="btn-signin" id="sign-in-btn">Sign In</button>
      </div>
      <div id="auth-signed-in" class="hidden">
        <span class="user-info">
          <span id="user-name"></span>
          <button class="btn-secondary" id="sign-out-btn">Sign Out</button>
        </span>
      </div>
    </header>

    <!-- Page content -->
    <main class="content">
      {{ content | safe }}
    </main>

  </div>
</div>

<script>
  // Clerk auth init
  (async () => {
    const clerk = new Clerk('{{ clerkPublishableKey or "pk_test_REPLACE_ME" }}');
    await clerk.load();
    window.__clerk = clerk;

    const out = document.getElementById('auth-signed-out');
    const inn = document.getElementById('auth-signed-in');
    const nameEl = document.getElementById('user-name');

    if (clerk.user) {
      inn.classList.remove('hidden');
      nameEl.textContent = clerk.user.firstName || clerk.user.emailAddresses[0].emailAddress;
    } else {
      out.classList.remove('hidden');
    }

    document.getElementById('sign-in-btn')?.addEventListener('click', () => clerk.openSignIn());
    document.getElementById('sign-out-btn')?.addEventListener('click', () => clerk.signOut().then(() => location.reload()));
  })();
</script>
<script src="/js/portal.js"></script>
{{ extraScripts | safe }}
</body>
</html>
```

- [ ] **Step 2: Update src/index.njk to use the layout**

```njk
---
layout: base.njk
title: Home
---
<p style="color:white">Homepage content goes here</p>
```

- [ ] **Step 3: Run dev server and verify sidebar + topbar render**

```bash
npm run dev
```

Open `http://localhost:8080`. Expected: sidebar on left, top bar visible, "Homepage content goes here" in main area.

- [ ] **Step 4: Commit**

```bash
git add src/_includes/base.njk src/index.njk
git commit -m "feat: base layout — sidebar, topbar, Clerk auth slots"
```

---

### Task 4: Game catalog data + homepage

**Files:**
- Create: `src/_data/games.json`
- Modify: `src/index.njk`

- [ ] **Step 1: Create src/_data/games.json with starter games**

```json
[
  {
    "slug": "snake",
    "title": "Snake",
    "category": "arcade",
    "description": "Classic snake game. Eat food, grow longer, don't hit the walls. How long can you last?",
    "emoji": "🐍",
    "controls": "Arrow keys or WASD",
    "new": true,
    "featured": true
  },
  {
    "slug": "breakout",
    "title": "Breakout",
    "category": "arcade",
    "description": "Smash all the bricks with your ball and paddle. Don't let the ball fall!",
    "emoji": "🏓",
    "controls": "Mouse or left/right arrow keys",
    "new": true,
    "featured": false
  }
]
```

- [ ] **Step 2: Replace src/index.njk with full homepage**

```njk
---
layout: base.njk
title: Home
---

{% set topPicks  = games | selectattr("featured") | list %}
{% set newGames  = games | selectattr("new") | list %}

<!-- Top picks row -->
<div class="row">
  <div class="row-header">
    <h2>Top picks for you</h2>
    <a href="/all/">See all</a>
  </div>
  <div class="games-grid large">
    {% for game in topPicks %}
    <a class="game-card" href="/games/{{ game.slug }}/">
      <div class="thumb">
        {% if game.thumbnail %}
          <img src="/public/thumbnails/{{ game.slug }}.jpg" alt="{{ game.title }}" loading="lazy">
        {% else %}
          <span class="emoji">{{ game.emoji }}</span>
        {% endif %}
      </div>
      <div class="info">
        <div class="title">{{ game.title }}</div>
        <div class="cat">{{ game.category }}</div>
      </div>
    </a>
    {% endfor %}
  </div>
</div>

<!-- New games row -->
{% if newGames.length %}
<div class="row">
  <div class="row-header">
    <h2>New games <span class="badge-new">NEW</span></h2>
    <a href="/new/">See all</a>
  </div>
  <div class="games-grid medium">
    {% for game in newGames %}
    <a class="game-card" href="/games/{{ game.slug }}/">
      <div class="thumb">
        {% if game.thumbnail %}
          <img src="/public/thumbnails/{{ game.slug }}.jpg" alt="{{ game.title }}" loading="lazy">
        {% else %}
          <span class="emoji">{{ game.emoji }}</span>
        {% endif %}
      </div>
      <div class="info">
        <div class="title">{{ game.title }}</div>
        <div class="cat">{{ game.category }}</div>
      </div>
    </a>
    {% endfor %}
  </div>
</div>
{% endif %}
```

- [ ] **Step 3: Verify homepage renders game cards**

```bash
npm run dev
```

Open `http://localhost:8080`. Expected: two rows of game cards (Snake, Breakout) with emoji thumbnails.

- [ ] **Step 4: Commit**

```bash
git add src/_data/games.json src/index.njk
git commit -m "feat: homepage — curated rows from games.json catalog"
```

---

### Task 5: Game detail page template

**Files:**
- Create: `src/games/[slug].njk`
- Create: `src/js/shell.js`

- [ ] **Step 1: Create src/games/[slug].njk**

```njk
---
pagination:
  data: games
  size: 1
  alias: game
permalink: /games/{{ game.slug }}/
layout: base.njk
collapsedSidebar: true
---

{% set related = games | selectattr("category", game.category) | reject("slug", game.slug) | list | slice(0, 4) %}

<div class="game-page">
  <div class="game-area">

    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <a href="/">Home</a> /
      <a href="/category/{{ game.category }}/">{{ game.category | capitalize }}</a> /
      {{ game.title }}
    </div>

    <!-- Game iframe -->
    <div class="game-frame-wrap" id="game-wrap">
      <iframe
        id="game-frame"
        src="/games/{{ game.slug }}/game.html"
        title="{{ game.title }}"
        allowfullscreen
        sandbox="allow-scripts allow-same-origin allow-popups"
      ></iframe>
      <button class="btn-fullscreen" id="fullscreen-btn">⛶ Fullscreen</button>
    </div>

    <!-- Controls -->
    <div class="game-controls">
      <button class="btn-secondary" id="restart-btn">♻️ Restart</button>
      <span class="controls-hint">{{ game.controls }}</span>
    </div>

    <!-- Info -->
    <div class="game-info">
      <h1>{{ game.title }}</h1>
      <div class="meta">{{ game.category | upper }}</div>
      <div class="desc">{{ game.description }}</div>
    </div>

  </div>

  <!-- Related games sidebar -->
  <aside class="game-sidebar">
    <h3>More {{ game.category }}</h3>
    {% for r in related %}
    <a class="related-card" href="/games/{{ r.slug }}/">
      <span class="emoji">{{ r.emoji }}</span>
      <div>
        <div class="rtitle">{{ r.title }}</div>
        <div class="rcat">{{ r.category }}</div>
      </div>
    </a>
    {% endfor %}
  </aside>
</div>

{% set extraScripts %}
<script>
  const GAME_SLUG = '{{ game.slug }}';
</script>
<script src="/js/shell.js"></script>
{% endset %}
```

- [ ] **Step 2: Add Nunjucks filters to .eleventy.js for selectattr/reject/slice**

Replace `.eleventy.js` with:

```js
module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("games");
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });

  // Filter: select items where item[attr] is truthy or equals value
  eleventyConfig.addFilter("selectattr", function (arr, attr, val) {
    if (!Array.isArray(arr)) return [];
    if (val === undefined) return arr.filter(item => item[attr]);
    return arr.filter(item => item[attr] === val);
  });

  // Filter: reject items where item[attr] equals value
  eleventyConfig.addFilter("reject", function (arr, attr, val) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(item => item[attr] !== val);
  });

  // Filter: slice array
  eleventyConfig.addFilter("slice", function (arr, start, end) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(start, end);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
  };
};
```

- [ ] **Step 3: Create src/js/shell.js**

```js
// shell.js — runs on game detail pages
// Handles postMessage from the game iframe + save API calls

const frame = document.getElementById('game-frame');
const restartBtn = document.getElementById('restart-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const gameWrap = document.getElementById('game-wrap');

// ── Fullscreen ────────────────────────────────────────────────────
fullscreenBtn?.addEventListener('click', () => {
  if (gameWrap.requestFullscreen) gameWrap.requestFullscreen();
  else if (gameWrap.webkitRequestFullscreen) gameWrap.webkitRequestFullscreen();
});

// ── Restart ───────────────────────────────────────────────────────
restartBtn?.addEventListener('click', () => {
  frame.src = frame.src; // reload iframe
});

// ── Auth helper ───────────────────────────────────────────────────
async function getToken() {
  const clerk = window.__clerk;
  if (!clerk || !clerk.session) return null;
  return clerk.session.getToken();
}

// ── Load save on game ready ───────────────────────────────────────
async function loadSave() {
  const token = await getToken();
  if (!token) return; // not logged in — no save to load

  const res = await fetch(`/api/saves/${GAME_SLUG}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;
  const { data } = await res.json();
  if (data) {
    frame.addEventListener('load', () => {
      frame.contentWindow.postMessage({ type: 'load-save', data }, '*');
    }, { once: true });
  }
}

// ── Handle save messages from iframe ─────────────────────────────
window.addEventListener('message', async (e) => {
  if (e.source !== frame.contentWindow) return;
  if (e.data?.type !== 'save') return;

  const token = await getToken();
  if (!token) return; // not logged in — silently skip

  await fetch(`/api/saves/${GAME_SLUG}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: e.data.data })
  });
});

// Wait for Clerk to init, then load save
window.addEventListener('load', () => {
  setTimeout(loadSave, 500); // Clerk needs ~500ms to initialise
});
```

- [ ] **Step 4: Create src/js/portal.js**

```js
// portal.js — homepage interactivity (search, future category filtering)

const searchInput = document.getElementById('search-input');

searchInput?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.game-card').forEach(card => {
    const title = card.querySelector('.title')?.textContent.toLowerCase() || '';
    const cat   = card.querySelector('.cat')?.textContent.toLowerCase() || '';
    card.style.display = (title.includes(q) || cat.includes(q)) ? '' : 'none';
  });
});
```

- [ ] **Step 5: Verify game detail pages build**

```bash
npm run dev
```

Open `http://localhost:8080/games/snake/`. Expected: game detail page with iframe (404 for now, game not created yet), collapsed sidebar, restart button, breadcrumb, info section.

- [ ] **Step 6: Commit**

```bash
git add src/games/ src/js/ .eleventy.js
git commit -m "feat: game detail page — iframe shell, postMessage save handler, fullscreen"
```

---

## Phase 3 — Backend (Cloudflare Workers + D1)

### Task 6: Wrangler config + D1 schema

**Files:**
- Create: `wrangler.toml`
- Create: `functions/api/saves/[slug].js`

- [ ] **Step 1: Create wrangler.toml**

```toml
name = "gaming-portal"
compatibility_date = "2024-01-01"
pages_build_output_dir = "_site"

[[d1_databases]]
binding = "DB"
database_name = "gaming-portal-db"
database_id = "REPLACE_AFTER_CREATION"
```

- [ ] **Step 2: Create D1 database**

```bash
npx wrangler d1 create gaming-portal-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml` replacing `REPLACE_AFTER_CREATION`.

- [ ] **Step 3: Create the D1 migration file**

```bash
mkdir -p migrations
```

Create `migrations/0001_game_saves.sql`:

```sql
CREATE TABLE IF NOT EXISTS game_saves (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL,
  game_slug  TEXT    NOT NULL,
  save_data  TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, game_slug)
);
```

- [ ] **Step 4: Apply migration to local D1**

```bash
npx wrangler d1 execute gaming-portal-db --local --file=migrations/0001_game_saves.sql
```

Expected: `Successfully applied migration`.

- [ ] **Step 5: Commit**

```bash
git add wrangler.toml migrations/
git commit -m "feat: Cloudflare D1 schema — game_saves table"
```

---

### Task 7: Saves API Worker

**Files:**
- Create: `functions/api/saves/[slug].js`

- [ ] **Step 1: Write the Worker**

```js
// functions/api/saves/[slug].js
// Handles GET / PUT / DELETE for game save states.
// Expects Clerk JWT in Authorization: Bearer <token> header.

const CLERK_JWKS_URL = 'https://api.clerk.com/v1/jwks';

async function verifyClerkToken(token) {
  // Fetch JWKS and verify JWT signature
  // Returns userId string or null
  try {
    const [headerB64] = token.split('.');
    const header = JSON.parse(atob(headerB64));
    const jwksRes = await fetch(CLERK_JWKS_URL);
    const { keys } = await jwksRes.json();
    const key = keys.find(k => k.kid === header.kid);
    if (!key) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk', key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );
    const [, payloadB64, sigB64] = token.split('.');
    const data = new TextEncoder().encode(`${token.split('.')[0]}.${payloadB64}`);
    const sig  = Uint8Array.from(atob(sigB64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now() / 1000) return null;
    return payload.sub; // Clerk user_id
  } catch {
    return null;
  }
}

async function getUserId(request) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  return verifyClerkToken(token);
}

export async function onRequestGet({ request, env, params }) {
  const userId = await getUserId(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const slug = params.slug;
  const row = await env.DB.prepare(
    'SELECT save_data FROM game_saves WHERE user_id = ? AND game_slug = ?'
  ).bind(userId, slug).first();

  return Response.json({ data: row ? JSON.parse(row.save_data) : null });
}

export async function onRequestPut({ request, env, params }) {
  const userId = await getUserId(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const slug = params.slug;
  const body = await request.json();
  const now  = Math.floor(Date.now() / 1000);

  await env.DB.prepare(`
    INSERT INTO game_saves (user_id, game_slug, save_data, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, game_slug)
    DO UPDATE SET save_data = excluded.save_data, updated_at = excluded.updated_at
  `).bind(userId, slug, JSON.stringify(body.data), now).run();

  return Response.json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  const userId = await getUserId(request);
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const slug = params.slug;
  await env.DB.prepare(
    'DELETE FROM game_saves WHERE user_id = ? AND game_slug = ?'
  ).bind(userId, slug).run();

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Test the API locally**

```bash
npm run preview
```

In a separate terminal, test the GET endpoint (expect 401 without auth):

```bash
curl http://localhost:8788/api/saves/snake
```

Expected: `Unauthorized`

- [ ] **Step 3: Commit**

```bash
git add functions/
git commit -m "feat: saves API — GET/PUT/DELETE with Clerk JWT verification"
```

---

## Phase 4 — Auth (Clerk)

### Task 8: Clerk setup

**Files:**
- Create: `.env.local`
- Modify: `src/_includes/base.njk`
- Modify: `wrangler.toml`

- [ ] **Step 1: Create a Clerk application**

1. Go to https://clerk.com and create an account
2. Create a new application — enable **Google** and **Email** sign-in
3. Copy your **Publishable Key** (`pk_test_...`) and **Secret Key** (`sk_test_...`)

- [ ] **Step 2: Create .env.local**

```bash
CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLERK_SECRET_KEY=sk_test_REPLACE_ME
```

- [ ] **Step 3: Create src/_data/env.js so Eleventy can read the key**

```js
// src/_data/env.js
module.exports = {
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || ''
};
```

- [ ] **Step 4: Update base.njk to use the data variable**

Find this line in `src/_includes/base.njk`:

```njk
const clerk = new Clerk('{{ clerkPublishableKey or "pk_test_REPLACE_ME" }}');
```

Replace with:

```njk
const clerk = new Clerk('{{ env.clerkPublishableKey }}');
```

- [ ] **Step 5: Add Clerk secret to wrangler.toml for the Worker**

```toml
[vars]
CLERK_JWKS_URL = "https://[your-clerk-frontend-api].clerk.accounts.dev/.well-known/jwks.json"
```

Get your Frontend API URL from the Clerk dashboard → API Keys → Frontend API URL.

Also update `functions/api/saves/[slug].js` — replace the hardcoded `CLERK_JWKS_URL` constant at the top:

```js
// Remove this line:
const CLERK_JWKS_URL = 'https://api.clerk.com/v1/jwks';

// The URL is now passed via env.CLERK_JWKS_URL in each handler:
// Replace all occurrences of `CLERK_JWKS_URL` in verifyClerkToken with env.CLERK_JWKS_URL
```

Update `verifyClerkToken` to accept the env:

```js
async function verifyClerkToken(token, jwksUrl) {
  try {
    const [headerB64] = token.split('.');
    const header = JSON.parse(atob(headerB64));
    const jwksRes = await fetch(jwksUrl);
    const { keys } = await jwksRes.json();
    const key = keys.find(k => k.kid === header.kid);
    if (!key) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk', key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );
    const [, payloadB64, sigB64] = token.split('.');
    const data = new TextEncoder().encode(`${token.split('.')[0]}.${payloadB64}`);
    const sig  = Uint8Array.from(atob(sigB64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Date.now() / 1000) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

async function getUserId(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  return verifyClerkToken(token, env.CLERK_JWKS_URL);
}
```

Update all three handler functions to pass `env` to `getUserId`:

```js
// In each handler, change:
const userId = await getUserId(request);
// To:
const userId = await getUserId(request, env);
```

- [ ] **Step 6: Load .env.local for Eleventy dev**

Install dotenv support:

```bash
npm install --save-dev dotenv
```

Add to the top of `.eleventy.js`:

```js
require('dotenv').config({ path: '.env.local' });
```

- [ ] **Step 7: Test sign-in flow**

```bash
npm run dev
```

Open `http://localhost:8080`. Expected: "Sign In" button in top bar. Click it → Clerk modal opens. Sign in with Google or email. After sign-in: button replaced with user name + "Sign Out".

- [ ] **Step 8: Commit**

```bash
git add src/_data/env.js src/_includes/base.njk functions/ wrangler.toml package.json
git commit -m "feat: Clerk auth — Google + email sign-in, JWT verification in Worker"
```

---

## Phase 5 — Game Template + First Game

### Task 9: Game template

**Files:**
- Create: `games/_game-template.html`

- [ ] **Step 1: Create the template**

This is the starting point for every new game. Copy it, rename the folder, fill in the game logic.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    canvas { display: block; image-rendering: pixelated; }

    /* ── AdSense overlay (pre-roll / interstitial) ─────────────── */
    #ad-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999;
      gap: 16px;
    }
    #ad-overlay.hidden { display: none; }
    #ad-container { width: 320px; min-height: 50px; }
    #ad-skip {
      color: #aaa;
      font-family: sans-serif;
      font-size: 13px;
      cursor: pointer;
      background: none;
      border: 1px solid #444;
      padding: 6px 16px;
      border-radius: 4px;
      color: #fff;
    }
  </style>
  <!-- Google AdSense for Games -->
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID" crossorigin="anonymous"></script>
</head>
<body>

<!-- Ad overlay (shown for pre-roll and interstitials) -->
<div id="ad-overlay">
  <ins class="adsbygoogle"
       id="ad-container"
       style="display:block"
       data-ad-client="ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID"
       data-ad-slot="REPLACE_WITH_AD_SLOT_ID"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <button id="ad-skip">Skip Ad ›</button>
</div>

<canvas id="canvas"></canvas>

<script>
// ═══════════════════════════════════════════════════════════════════
// GAME SDK — do not modify, copy into every game as-is
// ═══════════════════════════════════════════════════════════════════

const GameSDK = (() => {
  let saveData = null;
  let saveTimer = null;
  const SAVE_DEBOUNCE_MS = 2000; // coalesce rapid saves

  // Receive load-save from parent shell
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'load-save') {
      saveData = e.data.data;
      if (typeof onSaveLoaded === 'function') onSaveLoaded(saveData);
    }
  });

  function save(data) {
    // Debounce — don't spam the API on every frame
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      parent.postMessage({ type: 'save', data }, '*');
    }, SAVE_DEBOUNCE_MS);
  }

  // ── Ad management ──────────────────────────────────────────────
  const overlay = document.getElementById('ad-overlay');
  const skipBtn = document.getElementById('ad-skip');
  let adResolve = null;
  let skipDelay = 5; // seconds before skip is enabled

  skipBtn.disabled = true;
  skipBtn.textContent = `Skip Ad (${skipDelay})`;

  function runAdTimer() {
    const t = setInterval(() => {
      skipDelay--;
      skipBtn.textContent = skipDelay > 0 ? `Skip Ad (${skipDelay})` : 'Skip Ad ›';
      if (skipDelay <= 0) {
        skipBtn.disabled = false;
        clearInterval(t);
      }
    }, 1000);
  }

  function showAd() {
    return new Promise((resolve) => {
      adResolve = resolve;
      overlay.classList.remove('hidden');
      skipDelay = 5;
      skipBtn.disabled = true;
      skipBtn.textContent = `Skip Ad (${skipDelay})`;
      runAdTimer();
      try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
    });
  }

  skipBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (adResolve) { adResolve(); adResolve = null; }
  });

  return { save, showAd };
})();

// ═══════════════════════════════════════════════════════════════════
// GAME CODE — replace everything below with your game
// ═══════════════════════════════════════════════════════════════════

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Called by GameSDK when parent posts saved state
function onSaveLoaded(data) {
  // Restore game state from data
  // e.g. score = data.score; level = data.level;
}

async function init() {
  // Show pre-roll ad before game starts
  await GameSDK.showAd();

  // TODO: resize canvas, set up game loop, etc.
  canvas.width  = 480;
  canvas.height = 360;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Your game here', canvas.width / 2, canvas.height / 2);

  // Auto-save example — call after meaningful events:
  // GameSDK.save({ score: currentScore, level: currentLevel });
}

// Auto-save on visibility change (user switches tab or closes)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // GameSDK.save(getCurrentState());
  }
});

init();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add games/_game-template.html
git commit -m "feat: game template — canvas boilerplate, AdSense overlay, GameSDK auto-save"
```

---

### Task 10: First game — Snake

**Files:**
- Create: `games/snake/game.html`

- [ ] **Step 1: Create games/snake/game.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Snake</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    canvas { display: block; border: 2px solid #222; }
    #ui {
      position: fixed;
      top: 10px; left: 0; right: 0;
      text-align: center;
      color: #fff;
      font-family: monospace;
      font-size: 16px;
      pointer-events: none;
    }
    #ad-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.92);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      z-index: 999; gap: 16px;
    }
    #ad-overlay.hidden { display: none; }
    #ad-skip {
      color: #fff; background: none;
      border: 1px solid #444;
      padding: 6px 16px; border-radius: 4px;
      font-size: 13px; cursor: pointer;
    }
    #ad-container { width: 320px; min-height: 50px; }
  </style>
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID" crossorigin="anonymous"></script>
</head>
<body>

<div id="ad-overlay">
  <ins class="adsbygoogle" id="ad-container" style="display:block"
       data-ad-client="ca-pub-REPLACE_WITH_YOUR_PUBLISHER_ID"
       data-ad-slot="REPLACE_WITH_AD_SLOT_ID"
       data-ad-format="auto" data-full-width-responsive="true"></ins>
  <button id="ad-skip">Skip Ad ›</button>
</div>

<div id="ui">Score: <span id="score-el">0</span> | High: <span id="hi-el">0</span></div>
<canvas id="canvas"></canvas>

<script>
// ── GameSDK (same as template — copy verbatim) ────────────────────
const GameSDK = (() => {
  let saveTimer = null;
  const SAVE_DEBOUNCE_MS = 2000;

  window.addEventListener('message', (e) => {
    if (e.data?.type === 'load-save') {
      if (typeof onSaveLoaded === 'function') onSaveLoaded(e.data.data);
    }
  });

  function save(data) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      parent.postMessage({ type: 'save', data }, '*');
    }, SAVE_DEBOUNCE_MS);
  }

  const overlay = document.getElementById('ad-overlay');
  const skipBtn = document.getElementById('ad-skip');
  let adResolve = null;
  let skipDelay = 5;
  skipBtn.disabled = true;
  skipBtn.textContent = `Skip Ad (${skipDelay})`;

  function runAdTimer() {
    const t = setInterval(() => {
      skipDelay--;
      skipBtn.textContent = skipDelay > 0 ? `Skip Ad (${skipDelay})` : 'Skip Ad ›';
      if (skipDelay <= 0) { skipBtn.disabled = false; clearInterval(t); }
    }, 1000);
  }

  function showAd() {
    return new Promise((resolve) => {
      adResolve = resolve;
      overlay.classList.remove('hidden');
      skipDelay = 5; skipBtn.disabled = true;
      skipBtn.textContent = `Skip Ad (${skipDelay})`;
      runAdTimer();
      try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
    });
  }

  skipBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    if (adResolve) { adResolve(); adResolve = null; }
  });

  return { save, showAd };
})();

// ── Snake game ────────────────────────────────────────────────────
const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
const scoreEl = document.getElementById('score-el');
const hiEl    = document.getElementById('hi-el');

const COLS = 20, ROWS = 20, CELL = 24;
canvas.width  = COLS * CELL;
canvas.height = ROWS * CELL;

let snake, dir, nextDir, food, score, highScore, running, gameLoop;

function onSaveLoaded(data) {
  if (data?.highScore) {
    highScore = data.highScore;
    hiEl.textContent = highScore;
  }
}

function rand(max) { return Math.floor(Math.random() * max); }

function spawnFood() {
  let pos;
  do { pos = { x: rand(COLS), y: rand(ROWS) }; }
  while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

function startGame() {
  snake   = [{ x: 10, y: 10 }];
  dir     = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  food    = spawnFood();
  score   = 0;
  running = true;
  scoreEl.textContent = 0;
  clearInterval(gameLoop);
  gameLoop = setInterval(tick, 120);
}

function tick() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return gameOver();
  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) return gameOver();

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    food = spawnFood();
    // Auto-save on every food eaten
    GameSDK.save({ highScore: Math.max(score, highScore) });
  } else {
    snake.pop();
  }

  draw();
}

async function gameOver() {
  clearInterval(gameLoop);
  running = false;
  if (score > highScore) {
    highScore = score;
    hiEl.textContent = highScore;
    GameSDK.save({ highScore });
  }
  // Show interstitial on game over
  await GameSDK.showAd();
  startGame();
}

function draw() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < ROWS; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(canvas.width, y * CELL); ctx.stroke();
  }

  // Snake
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#5c5cff' : '#3a3a99';
    ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
  });

  // Food
  ctx.fillStyle = '#ff5c5c';
  ctx.beginPath();
  ctx.arc(food.x * CELL + CELL/2, food.y * CELL + CELL/2, CELL/2 - 2, 0, Math.PI * 2);
  ctx.fill();
}

// Input
document.addEventListener('keydown', (e) => {
  const map = {
    ArrowUp:    { x:  0, y: -1 }, w: { x:  0, y: -1 },
    ArrowDown:  { x:  0, y:  1 }, s: { x:  0, y:  1 },
    ArrowLeft:  { x: -1, y:  0 }, a: { x: -1, y:  0 },
    ArrowRight: { x:  1, y:  0 }, d: { x:  1, y:  0 },
  };
  const d = map[e.key];
  if (d && !(d.x === -dir.x && d.y === -dir.y)) nextDir = d;
});

// Auto-save on tab switch
document.addEventListener('visibilitychange', () => {
  if (document.hidden) GameSDK.save({ highScore });
});

async function init() {
  highScore = 0;
  hiEl.textContent = 0;
  await GameSDK.showAd(); // pre-roll
  startGame();
}

init();
</script>
</body>
</html>
```

- [ ] **Step 2: Add snake to games.json thumbnail field once you have an image**

For now the emoji fallback is used — no action needed.

- [ ] **Step 3: Test Snake locally**

```bash
npm run dev
```

Open `http://localhost:8080/games/snake/`. Expected:
- Game detail page loads with iframe
- Inside iframe: ad overlay shows for 5s then skip-able
- Snake game renders, arrow keys control the snake
- Score increments on eating food
- Game over → ad overlay → new game starts

- [ ] **Step 4: Commit**

```bash
git add games/snake/
git commit -m "feat: Snake game — canvas, auto-save (high score), AdSense overlay"
```

---

## Phase 6 — SEO

### Task 11: SEO — meta tags, structured data, sitemap

**Files:**
- Modify: `src/_includes/base.njk`
- Modify: `src/games/[slug].njk`
- Create: `src/sitemap.njk`
- Create: `src/robots.txt`

- [ ] **Step 1: Add Open Graph + Twitter meta to base.njk `<head>`**

Add after the `<title>` tag in `src/_includes/base.njk`:

```njk
<meta property="og:title"       content="{{ title }} | GamePortal">
<meta property="og:description" content="{{ description or 'Free HTML5 games — play instantly in your browser.' }}">
<meta property="og:type"        content="{{ ogType or 'website' }}">
<meta property="og:url"         content="{{ page.url }}">
<meta name="twitter:card"       content="summary">
```

- [ ] **Step 2: Add VideoGame structured data to game detail template**

Add inside the `{% set extraScripts %}` block in `src/games/[slug].njk`, before the `</script>`:

```njk
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "{{ game.title }}",
  "description": "{{ game.description }}",
  "genre": "{{ game.category }}",
  "gamePlatform": "Web Browser",
  "applicationCategory": "Game",
  "url": "https://yourdomain.com/games/{{ game.slug }}/"
}
</script>
```

- [ ] **Step 3: Update game detail front matter for SEO fields**

At the top of `src/games/[slug].njk`, update the front matter:

```njk
---
pagination:
  data: games
  size: 1
  alias: game
permalink: /games/{{ game.slug }}/
layout: base.njk
collapsedSidebar: true
---
```

Add title and description by inserting these lines after the front matter `---`, before the `{% set related %}` line:

```njk
{% set title = game.title %}
{% set description = game.description %}
{% set ogType = "website" %}
```

- [ ] **Step 4: Create sitemap**

Create `src/sitemap.njk`:

```njk
---
permalink: /sitemap.xml
eleventyExcludeFromCollections: true
---
<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://yourdomain.com/</loc><priority>1.0</priority></url>
  {% for game in games %}
  <url>
    <loc>https://yourdomain.com/games/{{ game.slug }}/</loc>
    <priority>0.8</priority>
    <changefreq>monthly</changefreq>
  </url>
  {% endfor %}
</urlset>
```

- [ ] **Step 5: Create robots.txt**

Create `src/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap.xml
```

Add passthrough for robots.txt in `.eleventy.js`:

```js
eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });
```

- [ ] **Step 6: Verify sitemap builds**

```bash
npm run build
cat _site/sitemap.xml
```

Expected: XML with entries for `/` and `/games/snake/`.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: SEO — OG meta, VideoGame schema, sitemap, robots.txt"
```

---

## Phase 7 — Deploy

### Task 12: Deploy to Cloudflare Pages

- [ ] **Step 1: Push repo to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/gaming-portal.git
git push -u origin main
```

- [ ] **Step 2: Create Cloudflare Pages project**

1. Go to Cloudflare Dashboard → Pages → Create a project
2. Connect to your GitHub repo
3. Build settings:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `_site`
4. Add environment variables:
   - `CLERK_PUBLISHABLE_KEY` = your Clerk publishable key
5. Click Deploy

- [ ] **Step 3: Apply D1 migration to production**

```bash
npx wrangler d1 execute gaming-portal-db --file=migrations/0001_game_saves.sql
```

- [ ] **Step 4: Bind D1 to Pages project**

In Cloudflare Dashboard → Pages → your project → Settings → Functions → D1 database bindings:
- Variable name: `DB`
- D1 database: `gaming-portal-db`

Also add the `CLERK_JWKS_URL` environment variable to Pages → Settings → Environment variables.

- [ ] **Step 5: Verify production deploy**

1. Open your `*.pages.dev` URL
2. Verify homepage loads with game cards
3. Navigate to `/games/snake/` — game iframe loads
4. Sign in with Google — Clerk modal works
5. Play Snake — high score auto-saves
6. Refresh page — high score persists

- [ ] **Step 6: Update sitemap domain**

Replace `https://yourdomain.com` in `src/sitemap.njk` and `src/robots.txt` with your actual Pages URL or custom domain.

```bash
git add src/sitemap.njk src/robots.txt
git commit -m "chore: update sitemap + robots with production domain"
git push
```

---

## Adding Future Games

To add a new game after the portal is live:

1. `cp -r games/_game-template.html games/YOUR_GAME/game.html`
2. Edit `games/YOUR_GAME/game.html` — implement your game below the `// GAME CODE` line
3. Add one entry to `src/_data/games.json`
4. Add a thumbnail image to `public/thumbnails/YOUR_GAME.jpg` (optional — emoji fallback works)
5. `git add . && git commit -m "feat: add YOUR_GAME" && git push`
6. Cloudflare Pages auto-deploys in ~30 seconds

The GameSDK auto-save and AdSense overlay are pre-wired in the template — no extra work needed.
