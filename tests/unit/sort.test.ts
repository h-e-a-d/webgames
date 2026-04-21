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
    const games = [mkGame('a'), mkGame('b'), mkGame('c')];
    const pins: Pins = { home: { hero: [], featured: ['c', 'a'] }, categoryPins: {} };
    const result = sortGames(games, { surface: 'home-featured', pins });
    expect(result.map((g) => g.slug)).toEqual(['c', 'a', 'b']);
  });

  it('falls back to rank (asc) after pins', () => {
    const games = [mkGame('a', { rank: 20 }), mkGame('b', { rank: 10 }), mkGame('c')];
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
    const pins: Pins = { home: { hero: [], featured: [] }, categoryPins: { puzzle: ['p2'] } };
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
