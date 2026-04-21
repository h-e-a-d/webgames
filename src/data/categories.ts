export interface Category {
  id: string;
  name: string;
  description: string;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'puzzle',
    name: 'Puzzle',
    description: 'Brain teasers, logic games, and pattern-matching challenges you can play in a browser.',
  },
  {
    id: 'arcade',
    name: 'Arcade',
    description: 'Fast-paced score chasers and classic arcade mechanics, all playable instantly in your browser.',
  },
  {
    id: 'action',
    name: 'Action',
    description: 'Reaction-heavy browser games: shooters, platformers, and fast-twitch fun.',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Quick, low-pressure games perfect for short breaks. Easy to pick up, easy to put down.',
  },
  {
    id: 'strategy',
    name: 'Strategy',
    description: 'Turn-based and real-time games that reward planning over reflexes.',
  },
  {
    id: 'io',
    name: '.io games',
    description: 'Massively-multiplayer arena games — the genre that started with Agar.io.',
  },
] as const;

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
export type CategoryId = (typeof CATEGORY_IDS)[number];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
