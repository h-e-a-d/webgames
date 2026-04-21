// Pre-build hook: generate 1200x630 OG PNGs for every game and blog post.
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { renderOgImage } from '../src/lib/og.ts';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const GAMES_DIR = join(ROOT, 'src/content/games');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT_GAMES = join(ROOT, 'public/og/games');
const OUT_BLOG = join(ROOT, 'public/og/blog');

async function walkMarkdown(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkMarkdown(full)));
    else if (e.name.endsWith('.md') || e.name.endsWith('.mdx')) out.push(full);
  }
  return out;
}

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function generate({ files, outDir, subtitleFor, slugFor }) {
  await ensureDir(outDir);
  let count = 0;
  for (const file of files) {
    const raw = await readFile(file, 'utf-8');
    const { data } = matter(raw);
    if (data.draft === true && process.env.NODE_ENV === 'production') continue;
    const slug = slugFor(file, data);
    const png = await renderOgImage({
      title: data.title ?? slug,
      subtitle: subtitleFor(data),
    });
    await writeFile(join(outDir, `${slug}.png`), png);
    count++;
  }
  return count;
}

function slugFromPath(file) {
  return file.split('/').pop().replace(/\.mdx?$/, '');
}

const gameFiles = await walkMarkdown(GAMES_DIR);
const blogFiles = await walkMarkdown(BLOG_DIR);

const gameCount = await generate({
  files: gameFiles,
  outDir: OUT_GAMES,
  slugFor: (file) => slugFromPath(file),
  subtitleFor: (data) =>
    Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories[0][0].toUpperCase() + data.categories[0].slice(1)
      : 'Play free',
});

const blogCount = await generate({
  files: blogFiles,
  outDir: OUT_BLOG,
  slugFor: (file) => slugFromPath(file),
  subtitleFor: () => 'Blog',
});

console.log(`[og] wrote ${gameCount} game + ${blogCount} blog OG images`);
