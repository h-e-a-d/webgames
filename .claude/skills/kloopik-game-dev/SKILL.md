---
name: kloopik-game-dev
description: Implement new HTML5 canvas games for the kloopik gaming portal. Use this skill whenever the user asks to add a game, build a game, create a new game, implement a game mechanic, or port a classic game to the portal — even if they just say "let's add Tetris" or "make a platformer" without mentioning the portal explicitly. This skill covers the full workflow: game logic, GameSDK integration, catalog entry, and design conventions.
---

# Kloopik Game Developer

You are building HTML5 canvas games for **kloopik** — a dark-themed gaming portal running on Eleventy + Cloudflare Pages. Games are isolated in iframes and communicate with the portal shell via `postMessage`.

## Portal at a glance

```
/portal
├── games/
│   ├── _game-template.html   ← always start here
│   └── breakout/game.html
└── src/_data/games.json      ← game catalog (add entry here too)
```

Every new game needs exactly two things:
1. `games/<slug>/game.html` — the standalone game file
2. A new entry in `src/_data/games.json` — so the portal generates a detail page

That's it. Eleventy auto-generates the `/games/<slug>/` page from the catalog entry.

---

## Step 1 — Add the catalog entry

Open `src/_data/games.json` and append a new object. All fields are required:

```json
{
  "slug": "tetris",
  "title": "Tetris",
  "category": "puzzle",
  "description": "Stack falling pieces, clear lines, survive as long as you can.",
  "emoji": "🟦",
  "controls": "Arrow keys, Z to rotate",
  "new": true,
  "featured": false,
  "howToPlay": "<p>Use <strong>left/right arrows</strong> to move pieces, <strong>up arrow</strong> or <strong>Z</strong> to rotate, <strong>down arrow</strong> to soft-drop. Clear full horizontal lines to score — they disappear and everything above falls down. The game ends when pieces stack above the top of the board.</p>",
  "about": "<p>Tetris was created by Soviet software engineer Alexey Pajitnov in 1984...</p>"
}
```

**Available categories:** `arcade`, `puzzle`, `card`, `action`, `strategy`, `runner`, `sports`, `shooting`

The `howToPlay` and `about` values are HTML strings — use `<p>`, `<strong>`, `<em>`.

---

## Step 2 — Build the game file

Create `games/<slug>/game.html`. Always start from `games/_game-template.html` — it has the GameSDK and correct boilerplate already in place.

### GameSDK (copy verbatim, never modify)

The template includes the full GameSDK. Here's what it exposes:

```js
// Save game state (debounced 2s — call after score/level changes)
GameSDK.save({ score: 100, level: 3, board: [...] });

// Restore saved state — implement this function in your game code
function onSaveLoaded(data) {
  highScore = data.highScore ?? 0;
}
```

The `onSaveLoaded` function is called automatically when the parent shell injects a save on load. Always guard against missing fields with `?? defaultValue`.

---

## Game architecture patterns

### Pattern A — Grid/turn-based games (Snake, Tetris, Minesweeper)

Use `setInterval` for a fixed tick rate. State is an array or 2D grid.

```js
const CELL = 24;
const COLS = 20, ROWS = 20;
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

let state = { /* grid, score, etc */ };

function tick() {
  update(state);
  render(state);
}

function init() {
  resetState();
  setInterval(tick, 120); // tune ms for difficulty
}
```

### Pattern B — Physics/real-time games (Breakout, Pong, Flappy)

Use `requestAnimationFrame` for smooth 60fps rendering. Track velocity as `vx/vy`.

```js
canvas.width = 480;
canvas.height = 320;

let ball = { x: 240, y: 160, vx: 3, vy: -3 };
let running = false;

function loop() {
  if (running) {
    update();
    render();
  }
  requestAnimationFrame(loop);
}

function init() {
  reset();
  running = true;
  requestAnimationFrame(loop);
}
```

### Pattern C — Endless runner / side-scroller

Scroll the world, not the player. Spawn obstacles from the right edge, remove them when they exit left.

```js
let obstacles = [];
let speed = 4;
let frameCount = 0;

function update() {
  frameCount++;
  if (frameCount % 90 === 0) obstacles.push(spawnObstacle());
  obstacles = obstacles.filter(o => o.x > -50);
  obstacles.forEach(o => o.x -= speed);
  speed += 0.001; // gradual difficulty ramp
}
```

---

## Visual design rules

Games run full-viewport inside a black iframe — match the portal's dark aesthetic:

- **Background:** `#000` or `#0a0a0f`
- **Text/UI:** white `#fff` or `#f0f0fa`, monospace font (`'Courier New', monospace`)
- **Accent:** `#5c5cff` (portal purple) for highlights, selected pieces, score emphasis
- **Secondary:** `#888` for muted labels, `#444` for grid lines
- **Canvas sizing:** Square `480×480` for grid games; `480×320` widescreen for horizontal physics; `480×640` portrait for vertical games (Flappy Bird style)

### HUD lives on canvas — no DOM overlays

Draw score, lives, and level directly to the canvas using `ctx.fillText`. Do not add `<div>` or `<span>` elements for game state — the iframe context makes DOM overlays fragile and they break the design consistency.

```js
// Standard HUD render pattern — canvas text only
ctx.fillStyle = '#888';
ctx.font = '13px monospace';
ctx.fillText('SCORE', 8, 20);
ctx.fillStyle = '#fff';
ctx.font = 'bold 20px monospace';
ctx.fillText(score, 8, 44);

ctx.fillStyle = '#888';
ctx.textAlign = 'right';
ctx.fillText('BEST', canvas.width - 8, 20);
ctx.fillStyle = '#fff';
ctx.fillText(highScore, canvas.width - 8, 44);
ctx.textAlign = 'left';
```

---

## Game over / level complete

```js
function gameOver() {
  running = false;
  if (score > highScore) {
    highScore = score;
    GameSDK.save({ highScore });
  }
  // show game-over screen or auto-restart
}
```

---

## Input handling

Cover both keyboard and pointer where it makes sense:

```js
// Keyboard
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  e.preventDefault(); // prevent arrow keys from scrolling the iframe
});
document.addEventListener('keyup', e => keys[e.key] = false);

// Mouse/touch for paddle games
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  paddleX = e.clientX - rect.left - PADDLE_W / 2;
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  paddleX = e.touches[0].clientX - rect.left - PADDLE_W / 2;
}, { passive: false });
```

---

## Scope: start with the minimal playable game

Implement the core loop first — one difficulty, one mode, the classic rules. Don't add difficulty selectors, level progression, or bonus features unless the user asked for them. A focused 300-line game that plays well is better than a 600-line game with three modes.

- **Tetris**: standard 10×20 board, one rotation system, no hold piece unless asked
- **Minesweeper**: 9×9 beginner grid by default, no difficulty selector unless asked
- **Snake**: 20×20 grid, one speed — that's it

---

## Save strategy

Save only what's meaningful to persist across sessions. Typical save objects:

- **Arcade / score-attack:** `{ highScore }` — just the best score
- **Puzzle / progression:** `{ highScore, level, boardState }` — full state
- **Card / board games:** `{ highScore, currentGame }` — ongoing game state

Always call `GameSDK.save()` on meaningful events (score increase, level complete, game over), not every frame.

```js
// Also save on tab switch / close
document.addEventListener('visibilitychange', () => {
  if (document.hidden) GameSDK.save(getCurrentState());
});
```

---

## Checklist before finishing

- [ ] `games/<slug>/game.html` exists and opens standalone in a browser
- [ ] `GameSDK.save()` called with the right data after score/state changes
- [ ] `onSaveLoaded()` implemented and guards with `?? default`
- [ ] Catalog entry added to `src/_data/games.json` with all fields
- [ ] Arrow keys call `e.preventDefault()` to prevent iframe scroll
- [ ] Canvas sized appropriately (no larger than needed)
