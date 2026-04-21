import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://www.kloopik.com',
  trailingSlash: 'always',
  output: 'static',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/admin') &&
        !page.includes('/draft'),
      changefreq: 'weekly',
      priority: 0.7,
    }),
    mdx(),
  ],
});
