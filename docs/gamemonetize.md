# GameMonetize RSS Feed Reference

Reference for constructing GameMonetize feed URLs used by `scripts/ingest-gamemonetize.ts` and `src/lib/providers/gamemonetize.ts`.

## Base URL

```
https://gamemonetize.com/feed.php
```

## Parameters

| Parameter | Values | Notes |
|---|---|---|
| `format` | `0` (JSON), `1` (XML) | Always use `0` (JSON) |
| `num` | `10`, `25`, `50`, `100` | Games per page |
| `page` | `1`, `2`, `3`, … | 1-based page index |
| `category` | See table below | Omit (or omit entirely) for All categories |
| `type` | `games` | Filter to embeddable games only (recommended) |
| `popularity` | `mostplayed`, `newest`, `random` | Sort order |
| `amount` | integer | Alternative to `num` — accepted by the API, same meaning |

### Minimal all-categories URL

```
https://gamemonetize.com/feed.php?format=0&num=50&page=1
```

### Recommended ingest URL (what the codebase currently uses)

```
https://gamemonetize.com/feed.php?format=0&type=games&popularity=mostplayed&category=all&amount=100
```

`category=all` is equivalent to omitting the parameter.

## Category IDs

IDs are assigned sequentially in the dropdown order (the first three are confirmed by the UI examples; the rest follow the same alphabetical sequence).

| # | Category name | `category=` value |
|---|---|---|
| All | All categories | omit or `all` |
| 1 | .IO | `1` |
| 2 | 2 Player | `2` |
| 3 | 3D | `3` |
| 4 | Action | `4` |
| 5 | Adventure | `5` |
| 6 | Arcade | `6` |
| 7 | Baby Hazel | `7` |
| 8 | Bejeweled | `8` |
| 9 | Boys | `9` |
| 10 | Clicker | `10` |
| 11 | Cooking | `11` |
| 12 | Girls | `12` |
| 13 | Hypercasual | `13` |
| 14 | Multiplayer | `14` |
| 15 | Puzzle | `15` |
| 16 | Racing | `16` |
| 17 | Shooting | `17` |
| 18 | Soccer | `18` |
| 19 | Sports | `19` |
| 20 | Stickman | `20` |

> IDs 1–3 are confirmed from the GameMonetize UI URL examples. IDs 4–20 are derived from their alphabetical position in the dropdown. If a fetch returns unexpected results, verify the ID by selecting the category in the UI at `https://gamemonetize.com/rss-feed/` and reading the generated URL.

## URL examples by use case

**Fetch 100 most-played games, all categories (current ingest default):**
```
https://gamemonetize.com/feed.php?format=0&type=games&popularity=mostplayed&category=all&amount=100
```

**Fetch 50 newest puzzle games, page 1:**
```
https://gamemonetize.com/feed.php?format=0&type=games&popularity=newest&category=15&num=50&page=1
```

**Fetch 50 newest puzzle games, page 2:**
```
https://gamemonetize.com/feed.php?format=0&type=games&popularity=newest&category=15&num=50&page=2
```

**Fetch 50 most-played arcade games:**
```
https://gamemonetize.com/feed.php?format=0&type=games&popularity=mostplayed&category=6&num=50&page=1
```

**Fetch 100 random hypercasual games:**
```
https://gamemonetize.com/feed.php?format=0&type=games&popularity=random&category=13&num=100&page=1
```

## Pagination

The feed does not include a total-count field. To paginate:

1. Start at `page=1`.
2. Increment `page` until the response array is empty or shorter than `num`.

```ts
// Pseudocode
let page = 1;
const all: NormalizedGame[] = [];
while (true) {
  const url = `https://gamemonetize.com/feed.php?format=0&type=games&popularity=newest&category=${id}&num=50&page=${page}`;
  const batch = await fetchAndNormalize(url);
  if (batch.length === 0) break;
  all.push(...batch);
  if (batch.length < 50) break; // last page
  page++;
}
```

## JSON response shape

Each entry in the returned array has these fields (all strings unless noted):

```jsonc
{
  "id": "abc123",          // providerId — used for embed URL and thumbnail filename
  "title": "Game Name",
  "url": "https://html5.gamemonetize.co/<id>/",   // embedUrl
  "thumb": "https://img.gamemonetize.com/<id>/512x384.jpg",
  "width": 512,            // number — iframe/thumb width
  "height": 384,           // number — iframe/thumb height
  "category": "Puzzle",    // provider category name (not the numeric ID)
  "tags": "tag1, tag2",    // comma-separated string
  "description": "…",
  "instructions": "Use mouse to …"  // used to detect controls
}
```

`normalizeFeed()` in `src/lib/providers/gamemonetize.ts` converts this shape to `NormalizedGame`. Fields that are missing, empty, or wrong type are handled gracefully (width/height default to 512×384, category defaults to `casual`).

## Kloopik category mapping

`src/lib/providers/gamemonetize.ts` maps provider category names → Kloopik internal IDs:

| Provider category | Kloopik ID |
|---|---|
| Puzzle / Puzzles | `puzzle` |
| Shooting / Action / Adventure | `action` |
| Arcade / Racing | `arcade` |
| Sports / Girls / Boys / Clicker / Hypercasual / Cooking / Baby Hazel / Bejeweled / Stickman / 2 Player | `casual` |
| Strategy | `strategy` |
| .IO Games / Multiplayer | `io` |
| 3D | `casual` (fallback) |
| *(anything else)* | `casual` (fallback) |

To change the mapping, edit `PROVIDER_CATEGORY_MAP` in `src/lib/providers/gamemonetize.ts`.
