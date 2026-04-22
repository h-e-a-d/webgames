#!/usr/bin/env tsx
import { Command } from 'commander';
import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProvider } from '../src/lib/providers/index';
import { filenameFor, serializeFrontmatter, dedupeAgainstExisting } from '../src/lib/ingest';
import type { NormalizedGame } from '../src/lib/providers/types';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

async function readExistingSlugs(): Promise<Set<string>> {
  const dir = join(ROOT, 'src/content/games');
  const slugs = new Set<string>();
  async function walk(d: string) {
    try {
      const entries = await readdir(d, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory()) await walk(join(d, e.name));
        else if (e.name.endsWith('.md')) slugs.add(e.name.replace(/\.md$/, ''));
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
  await walk(dir);
  return slugs;
}

async function downloadThumbnail(game: NormalizedGame): Promise<void> {
  const outDir = join(ROOT, 'public/thumbnails', game.provider);
  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, `${game.slug}.webp`);
  try {
    await stat(outPath);
    return;   // already cached
  } catch {
    // fall through to download
  }
  const res = await fetch(game.thumbnail.src);
  if (!res.ok) {
    console.warn(`[ingest] skipped thumbnail for ${game.slug}: ${res.status} ${res.statusText}`);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
}

async function writeGameMarkdown(game: NormalizedGame, isoDate: string): Promise<void> {
  const outPath = join(ROOT, filenameFor(game));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, serializeFrontmatter(game, isoDate), 'utf-8');
}

async function main() {
  const program = new Command();
  program
    .option('--limit <n>', 'max games to ingest in this run', (v) => parseInt(v, 10), 20)
    .option('--category <id>', 'optional provider category filter')
    .option('--dry-run', 'print what would be written, do not touch disk', false)
    .parse(process.argv);

  const opts = program.opts<{ limit: number; category?: string; dryRun: boolean }>();
  const today = new Date().toISOString().slice(0, 10);

  const provider = getProvider('gamemonetize');
  console.log(`[ingest] fetching from ${provider.displayName} (limit=${opts.limit})`);
  let games = await provider.fetchCatalog({ limit: opts.limit });

  if (opts.category) {
    const want = opts.category.toLowerCase();
    games = games.filter((g) => g.categories.includes(want as NormalizedGame['categories'][number]));
  }

  const existing = await readExistingSlugs();
  const fresh = dedupeAgainstExisting(games, existing);
  console.log(`[ingest] ${games.length} fetched, ${fresh.length} new (${games.length - fresh.length} dedup skipped)`);

  if (fresh.length === 0) {
    console.log('[ingest] nothing to do.');
    return;
  }

  if (opts.dryRun) {
    for (const g of fresh) {
      console.log(`DRY — would write ${filenameFor(g)}`);
    }
    return;
  }

  let written = 0;
  for (const g of fresh) {
    await writeGameMarkdown(g, today);
    await downloadThumbnail(g);
    written++;
  }
  console.log(`[ingest] wrote ${written} draft markdown files to src/content/games/`);
  console.log('[ingest] Next: review each, write editorial body, set draft: false, commit.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
