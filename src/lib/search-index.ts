import type { GameEntry } from './games';

export interface SearchIndexEntry {
  slug: string;
  title: string;
  thumbnail: string;
  categories: string[];
  tags: string[];
}

export function buildSearchIndex(games: GameEntry[]): SearchIndexEntry[] {
  return games
    .map((g) => ({
      slug: g.slug,
      title: g.data.title,
      thumbnail: g.data.thumbnail.src,
      categories: [...g.data.categories],
      tags: [...g.data.tags],
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
