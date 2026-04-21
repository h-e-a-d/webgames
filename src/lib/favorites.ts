import { readList, writeList, isInList } from './storage';

export const FAVORITES_KEY = 'kloopik.favorites.v1';
export const FAVORITES_LIMIT = 200;

export function getFavorites(): string[] {
  return readList(FAVORITES_KEY);
}

export function isFavorite(slug: string): boolean {
  return isInList(FAVORITES_KEY, slug);
}

export interface ToggleResult {
  added: boolean;
  total: number;
}

export function toggleFavorite(slug: string): ToggleResult {
  const current = readList(FAVORITES_KEY);
  const idx = current.indexOf(slug);
  if (idx >= 0) {
    current.splice(idx, 1);
    writeList(FAVORITES_KEY, current);
    return { added: false, total: current.length };
  }
  current.push(slug);
  while (current.length > FAVORITES_LIMIT) {
    current.shift();
  }
  writeList(FAVORITES_KEY, current);
  return { added: true, total: current.length };
}

export function clearFavorites(): void {
  writeList(FAVORITES_KEY, []);
}
