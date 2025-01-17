// 1. Import utilities from `astro:content`
import { defineCollection, z } from 'astro:content';

// 2. Import loader(s)
import { glob } from 'astro/loaders';

// 3. Define your collection(s)
const words = defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "src/words" }),
    schema: z.object({
        title: z.string(),
        // Allow dates and parse strings as dates
        date: z.date().or(z.string().transform((val) => new Date(val))),
        author: z.string(),
        tags: z.array(z.string()).optional(),
    }),
});

// 4. Export a single `collections` object to register your collection(s)
export const collections = { words };