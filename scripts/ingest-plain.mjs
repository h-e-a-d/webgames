#!/usr/bin/env node
// Plain ESM script — no tsx/esbuild needed
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const FEED_URL = 'https://gamemonetize.com/feed.php?format=0&num=50&page=1';

const CATEGORY_MAP = {
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

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapCategory(cat) {
  return CATEGORY_MAP[cat.toLowerCase().trim()] ?? ['casual'];
}

function detectControls(instructions) {
  const text = (instructions || '').toLowerCase();
  const controls = [];
  if (/\b(touch|tap|swipe)\b/.test(text)) controls.push('touch');
  if (/\b(keyboard|wasd|arrow|space)\b/.test(text)) controls.push('keyboard');
  if (/\b(mouse|click|drag)\b/.test(text)) controls.push('mouse');
  if (controls.length === 0) controls.push('mouse');
  return controls.sort();
}

function yamlStr(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`;
}

function yamlList(items) {
  return '\n' + items.map(i => `  - ${i}`).join('\n');
}

function serialize(game, isoDate) {
  const lines = [
    '---',
    `title: ${yamlStr(game.title)}`,
    `provider: gamemonetize`,
    `providerId: ${yamlStr(game.providerId)}`,
    `embedUrl: ${yamlStr(game.embedUrl)}`,
    'thumbnail:',
    `  src: ${yamlStr(`/thumbnails/gamemonetize/${game.slug}.webp`)}`,
    `  width: ${game.width}`,
    `  height: ${game.height}`,
    `categories:${yamlList(game.categories)}`,
    `tags: ${game.tags.length > 0 ? yamlList(game.tags) : '[]'}`,
    `controls:${yamlList(game.controls)}`,
    `orientation: ${game.height > game.width ? 'portrait' : 'landscape'}`,
    `addedAt: ${isoDate}`,
    'featured: false',
    'draft: false',
    '---',
    '',
    game.description.trim(),
    '',
  ];
  return lines.join('\n');
}

async function readExistingSlugs() {
  const dir = join(ROOT, 'src/content/games');
  const slugs = new Set();
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.endsWith('.md')) slugs.add(e.name.replace(/\.md$/, ''));
    }
  } catch {}
  return slugs;
}

async function downloadThumbnail(slug, thumbUrl) {
  const outDir = join(ROOT, 'public/thumbnails/gamemonetize');
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${slug}.webp`);
  try {
    await stat(outPath);
    return; // already cached
  } catch {}
  try {
    const res = await fetch(thumbUrl);
    if (!res.ok) { console.warn(`  skipped thumb ${slug}: ${res.status}`); return; }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(outPath, buf);
  } catch (e) {
    console.warn(`  thumb error ${slug}: ${e.message}`);
  }
}

async function main() {
  console.log(`[ingest] fetching ${FEED_URL}`);
  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error(`Feed failed: ${res.status} ${res.statusText}`);
  const raw = await res.json();
  console.log(`[ingest] got ${raw.length} entries from feed`);

  const today = new Date().toISOString().slice(0, 10);
  const existing = await readExistingSlugs();
  console.log(`[ingest] ${existing.size} existing games`);

  const seen = new Set();
  const games = [];
  for (const entry of raw) {
    if (!entry.title || !entry.id || !entry.url || !entry.thumb) continue;
    let slug = slugify(entry.title) || entry.id;
    let n = 2;
    while (seen.has(slug)) { slug = `${slugify(entry.title)}-${n}`; n++; }
    seen.add(slug);
    if (existing.has(slug)) { console.log(`  skip (exists): ${slug}`); continue; }

    games.push({
      slug,
      title: entry.title,
      providerId: entry.id,
      embedUrl: entry.url,
      thumbUrl: entry.thumb,
      width: typeof entry.width === 'number' && entry.width > 0 ? entry.width : 512,
      height: typeof entry.height === 'number' && entry.height > 0 ? entry.height : 384,
      categories: mapCategory(entry.category || 'casual'),
      tags: typeof entry.tags === 'string' ? entry.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      controls: detectControls(entry.instructions || ''),
      description: typeof entry.description === 'string' ? entry.description : '',
    });
  }

  console.log(`[ingest] ${games.length} new games to write`);

  let written = 0;
  for (const g of games) {
    const outPath = join(ROOT, 'src/content/games', `${g.slug}.md`);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, serialize(g, today), 'utf-8');
    await downloadThumbnail(g.slug, g.thumbUrl);
    written++;
    process.stdout.write(`\r  ${written}/${games.length} written`);
  }
  console.log(`\n[ingest] done — wrote ${written} games`);
  console.log('[ingest] All set to draft: false and ready to publish.');
  console.log('\nGame slugs (first 10):');
  games.slice(0, 10).forEach(g => console.log(' -', g.slug));
}

main().catch(e => { console.error(e); process.exit(1); });
