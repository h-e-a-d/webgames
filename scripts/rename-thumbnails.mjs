#!/usr/bin/env node
import { readdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const GAMES_DIR = join(ROOT, 'src/content/games');
const THUMBS_DIR = join(ROOT, 'public/thumbnails/gamemonetize');

const files = (await readdir(GAMES_DIR)).filter(f => f.endsWith('.md'));

let renamed = 0, skipped = 0;

for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const mdPath = join(GAMES_DIR, file);
  const content = await readFile(mdPath, 'utf-8');

  const providerIdMatch = content.match(/^providerId:\s*"([^"]+)"/m);
  if (!providerIdMatch) { console.warn(`no providerId in ${file}`); skipped++; continue; }
  const providerId = providerIdMatch[1];

  const oldThumb = join(THUMBS_DIR, `${providerId}.webp`);
  const newThumb = join(THUMBS_DIR, `${slug}.webp`);

  // rename thumbnail file if it exists and isn't already named correctly
  if (oldThumb !== newThumb) {
    try {
      await stat(oldThumb);
      await rename(oldThumb, newThumb);
    } catch {
      // already renamed or missing — check if new name exists
      try { await stat(newThumb); } catch { console.warn(`  missing thumb for ${slug}`); }
    }
  }

  // update src in markdown
  const oldSrc = `/thumbnails/gamemonetize/${providerId}.webp`;
  const newSrc = `/thumbnails/gamemonetize/${slug}.webp`;
  if (content.includes(oldSrc)) {
    await writeFile(mdPath, content.replace(oldSrc, newSrc), 'utf-8');
    console.log(`  ${providerId} → ${slug}`);
    renamed++;
  } else {
    skipped++;
  }
}

console.log(`\ndone: ${renamed} renamed, ${skipped} skipped`);
