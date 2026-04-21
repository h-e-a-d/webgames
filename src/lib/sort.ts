import type { CategoryId } from '../data/categories';

export interface SortableGame {
  slug: string;
  featured: boolean;
  rank?: number;
  addedAt: Date;
  categories: CategoryId[];
}

export interface Pins {
  home: { hero: string[]; featured: string[] };
  categoryPins: Record<string, string[]>;
}

export type Surface = 'home-hero' | 'home-featured' | 'all' | 'category';

export interface SortOptions {
  surface: Surface;
  pins: Pins;
  category?: CategoryId;
}

export function sortGames<G extends SortableGame>(games: G[], opts: SortOptions): G[] {
  const bySlug = new Map<string, G>(games.map((g) => [g.slug, g] as const));
  const pinned = resolvePinnedSlugs(opts);

  const pinnedGames: G[] = [];
  const pinnedSet = new Set<string>();
  for (const slug of pinned) {
    const g = bySlug.get(slug);
    if (g === undefined) continue;
    pinnedGames.push(g);
    pinnedSet.add(slug);
  }

  const scoped = opts.surface === 'category' && opts.category !== undefined
    ? games.filter((g) => g.categories.includes(opts.category!))
    : games;

  const remaining = scoped.filter((g) => !pinnedSet.has(g.slug));
  const ranked = remaining.filter((g) => g.rank !== undefined);
  ranked.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  const unranked = remaining.filter((g) => g.rank === undefined);
  unranked.sort((a, b) => defaultCompare(a, b));

  return [...pinnedGames, ...ranked, ...unranked];
}

function resolvePinnedSlugs(opts: SortOptions): string[] {
  switch (opts.surface) {
    case 'home-hero': return opts.pins.home.hero;
    case 'home-featured': return opts.pins.home.featured;
    case 'category':
      return opts.category !== undefined ? opts.pins.categoryPins[opts.category] ?? [] : [];
    case 'all':
    default:
      return [];
  }
}

function defaultCompare(a: SortableGame, b: SortableGame): number {
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return b.addedAt.getTime() - a.addedAt.getTime();
}
