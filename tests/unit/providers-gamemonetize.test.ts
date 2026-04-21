import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeFeed, mapProviderCategory, slugify, detectControls } from '../../src/lib/providers/gamemonetize';

const feed = JSON.parse(
  readFileSync(resolve(__dirname, '../fixtures/gamemonetize-feed.json'), 'utf-8'),
) as unknown[];

describe('gamemonetize adapter', () => {
  describe('slugify', () => {
    it('lowercases and hyphenates', () => {
      expect(slugify('Test Puzzle')).toBe('test-puzzle');
    });

    it('strips punctuation', () => {
      expect(slugify("Sam's BLAST! 3D")).toBe('sams-blast-3d');
    });

    it('handles ampersands and multi-space', () => {
      expect(slugify('Mario  &  Luigi')).toBe('mario-luigi');
    });

    it('falls back to provider id when title produces empty slug', () => {
      expect(slugify('???', 'abc123')).toBe('abc123');
    });
  });

  describe('mapProviderCategory', () => {
    it('maps known provider categories to our canonical ids', () => {
      expect(mapProviderCategory('Puzzles')).toEqual(['puzzle']);
      expect(mapProviderCategory('Shooting')).toEqual(['action']);
      expect(mapProviderCategory('Arcade')).toEqual(['arcade']);
    });

    it('returns ["casual"] for unknown provider categories', () => {
      expect(mapProviderCategory('Obscure')).toEqual(['casual']);
    });

    it('is case-insensitive', () => {
      expect(mapProviderCategory('puzzles')).toEqual(['puzzle']);
    });
  });

  describe('detectControls', () => {
    it('detects keyboard + mouse from instructions', () => {
      expect(detectControls('Use mouse and keyboard to play.')).toEqual(['keyboard', 'mouse']);
    });

    it('detects touch only', () => {
      expect(detectControls('Touch to play.')).toEqual(['touch']);
    });

    it('defaults to mouse when nothing detected', () => {
      expect(detectControls('')).toEqual(['mouse']);
    });
  });

  describe('normalizeFeed', () => {
    it('produces NormalizedGame entries with correct shape', () => {
      const games = normalizeFeed(feed);
      expect(games).toHaveLength(3);
      const puzzle = games[0];
      expect(puzzle.slug).toBe('test-puzzle');
      expect(puzzle.provider).toBe('gamemonetize');
      expect(puzzle.providerId).toBe('abc123');
      expect(puzzle.embedUrl).toBe('https://html5.gamemonetize.co/abc123/');
      expect(puzzle.categories).toEqual(['puzzle']);
      expect(puzzle.thumbnail.width).toBe(512);
      expect(puzzle.thumbnail.height).toBe(384);
    });

    it('ensures unique slugs when titles collide', () => {
      const colliding = [
        { ...(feed[0] as object), id: 'x1' },
        { ...(feed[0] as object), id: 'x2' },
      ];
      const games = normalizeFeed(colliding);
      expect(games.map((g) => g.slug)).toHaveLength(2);
      expect(new Set(games.map((g) => g.slug)).size).toBe(2);
    });

    it('silently drops malformed entries without throwing', () => {
      const dirty = [{ id: 'ok-id' }, ...feed];  // missing title, url, etc.
      const games = normalizeFeed(dirty);
      expect(games).toHaveLength(3);   // only the 3 well-formed ones
    });
  });
});
