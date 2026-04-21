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
- [ ] Blog post page renders at `/blog/`.
- [ ] RSS feed at `/rss.xml` is valid XML.
- [ ] `/sitemap-index.xml` resolves and lists sitemaps.
- [ ] `/llms.txt` resolves.

## SEO

- [ ] `<title>` on home page: "Kloopik — Free Browser Games".
- [ ] `og:image` on any game detail page resolves to a 1200×630 PNG (check in DevTools → Network).
- [ ] `<link rel="canonical">` on each page points to the correct URL.
- [ ] GSC: sitemap submitted and has 0 errors after 24h.

## Analytics

- [ ] GA4 Realtime shows a visitor within 30s of accepting consent.
- [ ] CF Web Analytics shows a pageview within 5 min.
- [ ] Consent banner appears on first visit in private window.
- [ ] Accepting → localStorage `kloopik.consent.v1` has `analytics: true`.
- [ ] Rejecting → `analytics: false`.

## Performance (run Lighthouse Desktop)

- [ ] Home page performance ≥ 90.
- [ ] Any game detail page performance ≥ 90.
- [ ] CLS ≤ 0.05 on both.

## Infrastructure

- [ ] `curl -I https://kloopik.com/` → 301 → `https://www.kloopik.com/`.
- [ ] `curl -I http://www.kloopik.com/` → 301 → `https://www.kloopik.com/`.
- [ ] Cloudflare Pages production deployment shows green on last commit.
- [ ] CI (GitHub Actions) green on main branch.
