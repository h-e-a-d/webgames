import type { APIContext } from 'astro';
import { getAllGames, getAllBlog } from '../lib/games';
import { sortGames } from '../lib/sort';
import { PINS } from '../data/featured';
import { CATEGORIES } from '../data/categories';

export async function GET(context: APIContext) {
  const site = context.site!.toString().replace(/\/$/, '');

  const games = await getAllGames();
  const sortable = games.map((g) => ({
    slug: g.slug,
    featured: g.data.featured,
    rank: g.data.rank,
    addedAt: g.data.addedAt,
    categories: g.data.categories,
  }));
  const topGames = sortGames(sortable, { surface: 'home-featured', pins: PINS }).slice(0, 20);
  const gameBySlug = new Map(games.map((g) => [g.slug, g] as const));

  const posts = (await getAllBlog())
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime())
    .slice(0, 20);

  const lines: string[] = [];
  lines.push('# Kloopik');
  lines.push('');
  lines.push('> Kloopik is a hand-curated directory of free browser games with original editorial reviews. Every listing is human-reviewed. No installs, no accounts.');
  lines.push('');
  lines.push('## Categories');
  for (const c of CATEGORIES) {
    lines.push(`- [${c.name}](${site}/categories/${c.id}/): ${c.description}`);
  }
  lines.push('');
  lines.push('## Top games');
  for (const s of topGames) {
    const g = gameBySlug.get(s.slug);
    if (!g) continue;
    lines.push(`- [${g.data.title}](${site}/games/${g.slug}/): ${g.data.categories.join(', ')}`);
  }
  lines.push('');
  lines.push('## Recent blog posts');
  for (const p of posts) {
    lines.push(`- [${p.data.title}](${site}/blog/${p.slug}/): ${p.data.description}`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
