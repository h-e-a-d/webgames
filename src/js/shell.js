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
    const deliver = () => {
      frame.contentWindow.postMessage({ type: 'load-save', data }, window.location.origin);
    };
    if (frame.contentWindow?.document?.readyState === 'complete') {
      deliver();
    } else {
      frame.addEventListener('load', deliver, { once: true });
    }
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
