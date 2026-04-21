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
