import type { APIRoute } from 'astro';
import { getAllGames } from '../lib/games';
import { buildSearchIndex } from '../lib/search-index';

export const GET: APIRoute = async () => {
  const games = await getAllGames();
  const index = buildSearchIndex(games);
  return new Response(JSON.stringify(index), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
