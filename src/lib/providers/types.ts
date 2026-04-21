import type { CategoryId } from '../../data/categories';

export interface NormalizedThumbnail {
  src: string;
  width: number;
  height: number;
}

export interface NormalizedGame {
  slug: string;
  title: string;
  provider: 'gamemonetize';
  providerId: string;
  embedUrl: string;
  thumbnail: NormalizedThumbnail;
  categories: CategoryId[];
  tags: string[];
  controls: Array<'mouse' | 'keyboard' | 'touch'>;
  orientation: 'landscape' | 'portrait' | 'both';
  description: string;
}

export interface Provider {
  id: NormalizedGame['provider'];
  displayName: string;
  fetchCatalog(opts?: { limit?: number }): Promise<NormalizedGame[]>;
}
