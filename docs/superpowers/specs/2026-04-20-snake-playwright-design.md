# Snake — Playwright Tests + UX Improvements

**Date:** 2026-04-20  
**Scope:** Write Playwright tests for `games/snake/game.html`, then improve the game based on what the tests expose plus known UX gaps.

---

## 1. Test Infrastructure

**Files:**
- `playwright.config.js` — project root, chromium only, 10s timeout, `baseURL` set from global setup
- `tests/globalSetup.js` — starts a Node `http.createServer` serving the project root on a free port; tears down in `globalTeardown.js`
- `tests/snake.spec.js` — all snake test cases

**Serving:** Static Node HTTP server (no dependency on Eleventy). Serves the project root so `GET /games/snake/game.html` works.

---

## 2. Test Cases

| # | Category | Description |
|---|----------|-------------|
| 1 | Render | Canvas is 480×480px, `#score-el` and `#hi-el` both show `0` on load |
| 2 | Controls | `ArrowRight` / `ArrowUp` / `ArrowLeft` / `ArrowDown` update direction (verified via `page.evaluate` on exposed game state) |
| 3 | WASD | `d`, `w`, `a`, `s` keys also update direction |
| 4 | Reverse block | Pressing opposite direction (e.g. Left while moving Right) is ignored |
| 5 | Score | Teleporting food onto snake head via `page.evaluate` causes score to increment to 1 |
| 6 | High score | Score exceeding previous best updates `#hi-el` |
| 7 | Game over | After collision, game-over overlay appears (currently fails — drives improvement) |
| 8 | Restart | Pressing a key on game-over overlay restarts the game and resets score to 0 |

**State exposure:** The game will expose a `window.__snake` object (added during improvements) with `{ snake, dir, food, score, highScore, state }` so tests can read and manipulate game state without pixel-scraping.

---

## 3. Improvements

### 3a. Game-over overlay (highest priority)
**Current:** `gameOver()` calls `startGame()` immediately — player gets zero feedback.  
**Fix:** On game over, pause the loop and render a canvas overlay showing:
- "GAME OVER" in large text
- Final score
- "press any key to restart" prompt  

Key/click dismisses the overlay and calls `startGame()`.

### 3b. Speed progression
**Current:** Fixed 120ms interval for the entire game.  
**Fix:** Recalculate interval on each food pickup: `Math.max(60, 120 - score * 3)`. Starts slow, caps at ~60ms (2× speed) by score 20. Makes the game feel increasingly tense.

### 3c. Touch/swipe controls
**Current:** Keyboard only — unplayable on mobile.  
**Fix:** `touchstart` / `touchend` listeners on the canvas. Detect swipe direction (dx/dy threshold of 20px) and map to the same direction logic as keyboard. No new UI needed.

### 3d. Arrow key scroll prevention
**Current:** `e.preventDefault()` is already called — this is fine. No change needed.

---

## 4. Implementation Order

1. Add `window.__snake` state exposure to game
2. Write all 8 Playwright tests (they drive what gets built)
3. Run tests — tests 7 and 8 will fail, confirming the gap
4. Implement game-over overlay (fixes tests 7 + 8)
5. Add speed progression
6. Add swipe controls
7. Re-run tests — all pass

---

## 5. Out of Scope

- Leaderboards / server-side score storage
- Sound effects
- Other games (Breakout, Minesweeper)
- Pause functionality
