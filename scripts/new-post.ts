#!/usr/bin/env tsx
import { Command } from 'commander';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  const program = new Command();
  program
    .requiredOption('--title <title>', 'post title')
    .option('--date <iso>', 'publish date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
    .option('--related <slugs>', 'comma-separated game slugs', '')
    .parse(process.argv);

  const opts = program.opts<{ title: string; date: string; related: string }>();
  const slug = slugify(opts.title);
  const filename = `${opts.date}-${slug}.md`;
  const outPath = join(ROOT, 'src/content/blog', filename);

  try {
    await stat(outPath);
    console.error(`[new:post] ${filename} already exists. Pick a different title.`);
    process.exit(1);
  } catch { /* not there; good */ }

  const related = opts.related
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const frontmatter = [
    '---',
    `title: "${opts.title.replace(/"/g, '\\"')}"`,
    `description: ""   # 150–200 chars for meta description`,
    `publishedAt: ${opts.date}`,
    `tags: []`,
    `relatedGames:${
      related.length === 0 ? ' []' : '\n' + related.map((s) => `  - ${s}`).join('\n')
    }`,
    `draft: true`,
    '---',
    '',
    `# ${opts.title}`,
    '',
    '<!-- First sentence: the factual, citable summary. -->',
    '',
    '## How it plays / what it covers',
    '',
    '## Why it matters',
    '',
    '## Related games on Kloopik',
    '',
    related.length > 0
      ? related.map((s) => `- [${s}](/games/${s}/)`).join('\n')
      : '- _Add 2+ internal links to games on Kloopik._',
    '',
  ].join('\n');

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, frontmatter, 'utf-8');
  console.log(`[new:post] wrote ${outPath}`);
  console.log('[new:post] When done, set draft: false and commit.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
