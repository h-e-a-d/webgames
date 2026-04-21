import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getAllBlog } from '../lib/games';

export async function GET(context: APIContext) {
  const posts = (await getAllBlog()).sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
  return rss({
    title: 'Kloopik — Blog',
    description: "Writing about browser games, curation, and what's worth playing.",
    site: context.site!.toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      pubDate: post.data.publishedAt,
    })),
  });
}
