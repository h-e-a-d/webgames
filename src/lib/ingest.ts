import type { NormalizedGame } from './providers/types';

const CONTENT_DIR = 'src/content/games';

export function filenameFor(game: NormalizedGame): string {
  return `${CONTENT_DIR}/${game.slug}.md`;
}

function yamlString(s: string): string {
  return `"${s.replace(/"/g, '\\"')}"`;
}

function yamlList(items: string[], indent = '  '): string {
  if (items.length === 0) return '[]';
  return '\n' + items.map((i) => `${indent}- ${i}`).join('\n');
}

export function serializeFrontmatter(game: NormalizedGame, isoDate: string): string {
  const lines: string[] = [
    '---',
    `title: ${yamlString(game.title)}`,
    `provider: ${game.provider}`,
    `providerId: ${yamlString(game.providerId)}`,
    `embedUrl: ${yamlString(game.embedUrl)}`,
    'thumbnail:',
    `  src: ${yamlString(`/thumbnails/${game.provider}/${game.slug}.webp`)}`,
    `  width: ${game.thumbnail.width}`,
    `  height: ${game.thumbnail.height}`,
    `categories:${yamlList(game.categories)}`,
    `tags: ${game.tags.length > 0 ? yamlList(game.tags) : '[]'}`,
    `controls:${yamlList(game.controls)}`,
    `orientation: ${game.orientation}`,
    `addedAt: ${isoDate}`,
    'draft: true',
    '---',
    '',
    '<!-- ingested — add editorial review here before setting draft: false -->',
    '',
    game.description.trim(),
    '',
  ];
  return lines.join('\n');
}

export function dedupeAgainstExisting(
  games: NormalizedGame[],
  existingSlugs: Set<string>,
): NormalizedGame[] {
  return games.filter((g) => !existingSlugs.has(g.slug));
}
