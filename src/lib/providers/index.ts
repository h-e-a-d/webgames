import type { Provider } from './types';
import { gamemonetizeProvider } from './gamemonetize';

export const PROVIDERS: Record<Provider['id'], Provider> = {
  gamemonetize: gamemonetizeProvider,
};

export function getProvider(id: Provider['id']): Provider {
  const p = PROVIDERS[id];
  if (p === undefined) throw new Error(`Unknown provider: ${id}`);
  return p;
}
