#!/usr/bin/env tsx
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) await walk(full, out);
      else if (e.name.endsWith('.md') || e.name.endsWith('.mdx')) out.push(full);
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  return out;
}

async function main() {
  const gameFiles = await walk(join(ROOT, 'src/content/games'));
  const publishedSlugs = new Set<string>();
  for (const file of gameFiles) {
    const raw = await readFile(file, 'utf-8');
    const { data } = matter(raw);
    if (data.draft === true) continue;
    const slug = file.split('/').pop()!.replace(/\.mdx?$/, '');
    publishedSlugs.add(slug);
  }

  const blogFiles = await walk(join(ROOT, 'src/content/blog'));
  const errors: string[] = [];
  for (const file of blogFiles) {
    const raw = await readFile(file, 'utf-8');
    const { data } = matter(raw);
    const related: unknown = data.relatedGames;
    if (!Array.isArray(related)) continue;
    for (const slug of related) {
      if (typeof slug !== 'string') continue;
      if (!publishedSlugs.has(slug)) {
        errors.push(`${file}: relatedGames points to unknown/draft slug "${slug}"`);
      }
    }
  }

  // Check all thumbnail src paths resolve (for local paths only)
  for (const file of gameFiles) {
    const raw = await readFile(file, 'utf-8');
    const { data } = matter(raw);
    if (data.draft === true) continue;
    const src = data?.thumbnail?.src;
    if (typeof src !== 'string') continue;
    if (!src.startsWith('/')) continue;   // external URL, skip
    try {
      await stat(join(ROOT, 'public', src));
    } catch {
      errors.push(`${file}: thumbnail.src "${src}" does not exist under public/`);
    }
  }

  if (errors.length > 0) {
    console.error('[check:links] broken references:');
    for (const e of errors) console.error('  -', e);
    process.exit(1);
  }
  console.log(`[check:links] ok — ${publishedSlugs.size} games, ${blogFiles.length} blog posts, no broken internal links`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
