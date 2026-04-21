const BRAND = 'Kloopik';

export function buildGameTitle(name: string): string {
  return `${name} — Play Free Online | ${BRAND}`;
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  const sliced = input.slice(0, max).replace(/\s+$/, '');
  return `${sliced}…`;
}

export function buildGameDescription(body: string): string {
  const firstParagraph = body.split(/\n\s*\n/)[0] ?? body;
  const cleaned = firstParagraph.replace(/\s+/g, ' ').trim();
  return truncate(cleaned, 150);
}

export interface VideoGameLdInput {
  name: string;
  description: string;
  url: string;
  image: string;
  genre: string[];
  inLanguage?: string;
}

export function buildVideoGameJsonLd(input: VideoGameLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    genre: input.genre,
    gamePlatform: 'Web',
    operatingSystem: 'Web',
    applicationCategory: 'Game',
    inLanguage: input.inLanguage ?? 'en',
  };
}

export interface ArticleLdInput {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  author?: string;
}

export function buildArticleJsonLd(input: ArticleLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    url: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    image: input.image,
    author: {
      '@type': 'Organization',
      name: input.author ?? BRAND,
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND,
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
