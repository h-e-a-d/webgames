import { defineCollection, z } from 'astro:content';
import { CATEGORY_IDS } from '../data/categories';

const CATEGORY_ENUM = z.enum(CATEGORY_IDS as [string, ...string[]]);
const gameProviderEnum = z.enum(['gamemonetize']);
const controlsSchema = z.enum(['mouse', 'keyboard', 'touch']);
const orientationSchema = z.enum(['landscape', 'portrait', 'both']);

const gamesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(100),
    provider: gameProviderEnum,
    providerId: z.string().min(1),
    embedUrl: z.string().url(),
    thumbnail: z.object({
      src: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    categories: z.array(CATEGORY_ENUM).min(1),
    tags: z.array(z.string()).default([]),
    controls: z.array(controlsSchema).min(1),
    orientation: orientationSchema.default('landscape'),
    addedAt: z.coerce.date(),
    featured: z.boolean().default(false),
    rank: z.number().int().positive().optional(),
    draft: z.boolean().default(false),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(200),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    hero: z.object({
      src: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      alt: z.string(),
    }).optional(),
    relatedGames: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  games: gamesCollection,
  blog: blogCollection,
};
