import { getCollection, type CollectionEntry } from 'astro:content';

export type GameEntry = CollectionEntry<'games'>;
export type BlogEntry = CollectionEntry<'blog'>;

const isProd = import.meta.env.PROD;

export async function getAllGames(): Promise<GameEntry[]> {
  const all = await getCollection('games');
  return isProd ? all.filter((g) => !g.data.draft) : all;
}

export async function getAllBlog(): Promise<BlogEntry[]> {
  const all = await getCollection('blog');
  return isProd ? all.filter((p) => !p.data.draft) : all;
}

export async function getGameBySlug(slug: string): Promise<GameEntry | undefined> {
  const all = await getAllGames();
  return all.find((g) => g.slug === slug);
}

export async function getGamesByCategory(categoryId: string): Promise<GameEntry[]> {
  const all = await getAllGames();
  return all.filter((g) => g.data.categories.includes(categoryId));
}

export async function getGamesBySlugs(slugs: string[]): Promise<GameEntry[]> {
  const all = await getAllGames();
  const bySlug = new Map(all.map((g) => [g.slug, g] as const));
  return slugs.map((s) => bySlug.get(s)).filter((g): g is GameEntry => g !== undefined);
}

export async function assertSlugsResolve(slugs: string[], context: string): Promise<void> {
  const all = await getAllGames();
  const known = new Set(all.map((g) => g.slug));
  const missing = slugs.filter((s) => !known.has(s));
  if (missing.length > 0) {
    throw new Error(`${context}: unknown game slugs: ${missing.join(', ')}`);
  }
}
