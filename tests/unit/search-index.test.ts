import { describe, it, expect } from 'vitest';
import { buildSearchIndex, type SearchIndexEntry } from '../../src/lib/search-index';

function fakeEntry(slug: string, overrides: Partial<SearchIndexEntry> = {}): unknown {
  return {
    slug,
    data: {
      title: overrides.title ?? slug,
      thumbnail: { src: overrides.thumbnail ?? `/thumb/${slug}.webp`, width: 512, height: 384 },
      categories: overrides.categories ?? ['puzzle'],
      tags: overrides.tags ?? ['fun'],
      draft: false,
    },
  };
}

describe('buildSearchIndex', () => {
  it('maps game entries to lean index entries', () => {
    const games = [fakeEntry('abc'), fakeEntry('def')] as Parameters<typeof buildSearchIndex>[0];
    const index = buildSearchIndex(games);
    expect(index).toHaveLength(2);
    const first = index[0];
    expect(first.slug).toBe('abc');
    expect(first.title).toBe('abc');
    expect(first.thumbnail).toBe('/thumb/abc.webp');
    expect(first.categories).toEqual(['puzzle']);
    expect(first.tags).toEqual(['fun']);
  });

  it('produces entries with stable ordering (alphabetical by slug)', () => {
    const games = [fakeEntry('zeta'), fakeEntry('alpha'), fakeEntry('mu')] as Parameters<typeof buildSearchIndex>[0];
    const index = buildSearchIndex(games);
    expect(index.map((e) => e.slug)).toEqual(['alpha', 'mu', 'zeta']);
  });

  it('omits fields not needed for search (keeps payload small)', () => {
    const games = [fakeEntry('abc')] as Parameters<typeof buildSearchIndex>[0];
    const index = buildSearchIndex(games);
    const entry = index[0] as unknown as Record<string, unknown>;
    expect(Object.keys(entry).sort()).toEqual(['categories', 'slug', 'tags', 'thumbnail', 'title']);
  });

  it('returns [] when given []', () => {
    expect(buildSearchIndex([])).toEqual([]);
  });
});
