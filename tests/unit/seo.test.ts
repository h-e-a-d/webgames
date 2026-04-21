import { describe, it, expect } from 'vitest';
import {
  buildGameTitle,
  buildGameDescription,
  truncate,
  buildVideoGameJsonLd,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
} from '../../src/lib/seo';

describe('seo helpers', () => {
  describe('buildGameTitle', () => {
    it('formats with brand suffix', () => {
      expect(buildGameTitle('2048')).toBe('2048 — Play Free Online | Kloopik');
    });

    it('keeps under 60 chars for short titles', () => {
      expect(buildGameTitle('Hex').length).toBeLessThan(60);
    });
  });

  describe('truncate', () => {
    it('truncates with ellipsis past limit', () => {
      expect(truncate('hello world', 5)).toBe('hello…');
    });

    it('returns input unchanged under limit', () => {
      expect(truncate('short', 100)).toBe('short');
    });

    it('trims trailing whitespace before ellipsis', () => {
      expect(truncate('hello    world', 6)).toBe('hello…');
    });
  });

  describe('buildGameDescription', () => {
    it('uses first 150 chars of body, trimmed cleanly', () => {
      const body = 'Slither.io is a multiplayer snake game where you grow by eating pellets. Other players are your obstacles.';
      expect(buildGameDescription(body).length).toBeLessThanOrEqual(155);
      expect(buildGameDescription(body).startsWith('Slither')).toBe(true);
    });
  });

  describe('buildVideoGameJsonLd', () => {
    it('emits required VideoGame fields', () => {
      const jsonLd = buildVideoGameJsonLd({
        name: 'Test',
        description: 'A test game.',
        url: 'https://www.kloopik.com/games/test/',
        image: 'https://www.kloopik.com/thumbnails/test.webp',
        genre: ['Puzzle'],
      });
      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('VideoGame');
      expect(jsonLd.name).toBe('Test');
      expect(jsonLd.gamePlatform).toBe('Web');
      expect(jsonLd.operatingSystem).toBe('Web');
    });
  });

  describe('buildArticleJsonLd', () => {
    it('emits required Article fields', () => {
      const jsonLd = buildArticleJsonLd({
        headline: 'Hello',
        description: 'A test post.',
        url: 'https://www.kloopik.com/blog/hello/',
        datePublished: '2026-05-01',
      });
      expect(jsonLd['@type']).toBe('Article');
      expect(jsonLd.headline).toBe('Hello');
      expect(jsonLd.datePublished).toBe('2026-05-01');
    });
  });

  describe('buildBreadcrumbJsonLd', () => {
    it('emits BreadcrumbList with positioned items', () => {
      const jsonLd = buildBreadcrumbJsonLd([
        { name: 'Home', url: 'https://www.kloopik.com/' },
        { name: 'Puzzle', url: 'https://www.kloopik.com/categories/puzzle/' },
        { name: '2048', url: 'https://www.kloopik.com/games/2048/' },
      ]);
      expect(jsonLd['@type']).toBe('BreadcrumbList');
      expect(jsonLd.itemListElement).toHaveLength(3);
      expect((jsonLd.itemListElement as { position: number }[])[0].position).toBe(1);
      expect((jsonLd.itemListElement as { position: number }[])[2].position).toBe(3);
    });
  });
});
