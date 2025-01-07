// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://latex4000.neocities.org", // TODO: Change this to actual domain once decided 
  integrations: [sitemap()],
  build: {
    format: "file",
  },
});