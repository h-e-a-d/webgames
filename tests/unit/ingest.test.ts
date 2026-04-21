import { describe, it, expect } from 'vitest';
import {
  filenameFor,
  serializeFrontmatter,
  dedupeAgainstExisting,
} from '../../src/lib/ingest';
import type { NormalizedGame } from '../../src/lib/providers/types';

function sampleGame(overrides: Partial<NormalizedGame> = {}): NormalizedGame {
  return {
    slug: 'test-puzzle',
    title: 'Test Puzzle',
    provider: 'gamemonetize',
    providerId: 'abc123',
    embedUrl: 'https://html5.gamemonetize.co/abc123/',
    thumbnail: { src: 'https://img.example.com/abc.jpg', width: 512, height: 384 },
    categories: ['puzzle'],
    tags: ['logic'],
    controls: ['mouse'],
    orientation: 'landscape',
    description: 'A test puzzle.',
    ...overrides,
  };
}

describe('filenameFor', () => {
  it('returns a flat path under src/content/games/ so Astro slugs stay flat', () => {
    expect(filenameFor(sampleGame())).toBe('src/content/games/test-puzzle.md');
  });
});

describe('serializeFrontmatter', () => {
  it('produces a parseable YAML frontmatter + draft body', () => {
    const g = sampleGame();
    const md = serializeFrontmatter(g, '2026-05-01');
    expect(md).toContain('---\n');
    expect(md).toContain('title: "Test Puzzle"');
    expect(md).toContain('provider: gamemonetize');
    expect(md).toContain('providerId: "abc123"');
    expect(md).toContain('embedUrl: "https://html5.gamemonetize.co/abc123/"');
    expect(md).toContain('categories:\n  - puzzle');
    expect(md).toContain('controls:\n  - mouse');
    expect(md).toContain('draft: true');
    expect(md).toContain('addedAt: 2026-05-01');
    expect(md).toContain('A test puzzle.');
  });

  it('escapes double quotes in titles', () => {
    const g = sampleGame({ title: 'Sam\'s "Big" Adventure' });
    const md = serializeFrontmatter(g, '2026-05-01');
    expect(md).toContain('title: "Sam\'s \\"Big\\" Adventure"');
  });

  it('omits empty tags and rank fields cleanly', () => {
    const g = sampleGame({ tags: [] });
    const md = serializeFrontmatter(g, '2026-05-01');
    expect(md).toContain('tags: []');
    expect(md).not.toContain('rank:');
    expect(md).not.toContain('featured:');
  });
});

describe('dedupeAgainstExisting', () => {
  it('drops entries whose slug already exists on disk', () => {
    const input = [sampleGame({ slug: 'keep-me' }), sampleGame({ slug: 'already-there' })];
    const existing = new Set(['already-there']);
    const out = dedupeAgainstExisting(input, existing);
    expect(out.map((g) => g.slug)).toEqual(['keep-me']);
  });

  it('returns input unchanged when no collisions', () => {
    const input = [sampleGame({ slug: 'a' }), sampleGame({ slug: 'b' })];
    const out = dedupeAgainstExisting(input, new Set());
    expect(out).toHaveLength(2);
  });
});
