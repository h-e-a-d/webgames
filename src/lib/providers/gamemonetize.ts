import type { NormalizedGame, Provider } from './types';
import type { CategoryId } from '../../data/categories';

interface RawEntry {
  title?: unknown;
  id?: unknown;
  url?: unknown;
  thumb?: unknown;
  width?: unknown;
  height?: unknown;
  category?: unknown;
  tags?: unknown;
  description?: unknown;
  instructions?: unknown;
}

export function slugify(input: string, fallback?: string): string {
  const slug = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (slug.length === 0 && fallback !== undefined) return fallback;
  return slug;
}

const PROVIDER_CATEGORY_MAP: Record<string, CategoryId[]> = {
  puzzles: ['puzzle'],
  puzzle: ['puzzle'],
  shooting: ['action'],
  action: ['action'],
  adventure: ['action'],
  arcade: ['arcade'],
  sports: ['casual'],
  racing: ['arcade'],
  strategy: ['strategy'],
  'io games': ['io'],
  'io-games': ['io'],
  multiplayer: ['io'],
  girls: ['casual'],
  'boys-games': ['casual'],
  clicker: ['casual'],
  hypercasual: ['casual'],
};

export function mapProviderCategory(providerCategory: string): CategoryId[] {
  const normalized = providerCategory.toLowerCase().trim();
  return PROVIDER_CATEGORY_MAP[normalized] ?? ['casual'];
}

export function detectControls(instructions: string): Array<'mouse' | 'keyboard' | 'touch'> {
  const text = instructions.toLowerCase();
  const controls: Array<'mouse' | 'keyboard' | 'touch'> = [];
  if (/\b(touch|tap|swipe)\b/.test(text)) controls.push('touch');
  if (/\b(keyboard|wasd|arrow|space)\b/.test(text)) controls.push('keyboard');
  if (/\b(mouse|click|drag)\b/.test(text)) controls.push('mouse');
  if (controls.length === 0) controls.push('mouse');
  return controls.sort();
}

function isStr(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

function normalizeEntry(entry: RawEntry): NormalizedGame | null {
  if (!isStr(entry.title) || !isStr(entry.id) || !isStr(entry.url) || !isStr(entry.thumb)) {
    return null;
  }
  const width = isNum(entry.width) ? entry.width : 512;
  const height = isNum(entry.height) ? entry.height : 384;
  const providerCategory = isStr(entry.category) ? entry.category : 'casual';
  const tags = isStr(entry.tags) ? entry.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const description = isStr(entry.description) ? entry.description : '';
  const instructions = isStr(entry.instructions) ? entry.instructions : '';

  return {
    slug: slugify(entry.title, entry.id),
    title: entry.title,
    provider: 'gamemonetize',
    providerId: entry.id,
    embedUrl: entry.url,
    thumbnail: { src: entry.thumb, width, height },
    categories: mapProviderCategory(providerCategory),
    tags,
    controls: detectControls(instructions),
    orientation: height > width ? 'portrait' : 'landscape',
    description,
  };
}

export function normalizeFeed(raw: unknown[]): NormalizedGame[] {
  const seen = new Set<string>();
  const out: NormalizedGame[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const normalized = normalizeEntry(entry as RawEntry);
    if (normalized === null) continue;
    let slug = normalized.slug;
    let n = 2;
    while (seen.has(slug)) {
      slug = `${normalized.slug}-${n}`;
      n++;
    }
    seen.add(slug);
    out.push({ ...normalized, slug });
  }
  return out;
}

export const gamemonetizeProvider: Provider = {
  id: 'gamemonetize',
  displayName: 'GameMonetize',
  async fetchCatalog(opts?: { limit?: number }): Promise<NormalizedGame[]> {
    const url = 'https://gamemonetize.com/feed.php?format=0&num=50&page=1';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`GameMonetize feed request failed: ${res.status} ${res.statusText}`);
    }
    const raw = (await res.json()) as unknown[];
    const limited = typeof opts?.limit === 'number' ? raw.slice(0, opts.limit) : raw;
    return normalizeFeed(limited);
  },
};
