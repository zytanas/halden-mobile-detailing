import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Legal pages (privacy, terms). Business details are written as {placeholders}
 * in the Markdown and filled in from site.ts at render time (see lib/legal.ts).
 */
const legal = defineCollection({
	loader: glob({ pattern: '*.md', base: './src/content/legal' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		/** Shown as "Last updated: …", e.g. "14 October 2026" */
		updated: z.string(),
		/** Optional callout shown above the content */
		notice: z.string().optional(),
	}),
});

export const collections = { legal };
