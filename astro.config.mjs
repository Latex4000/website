// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from "@astrojs/sitemap";

import svelte from "@astrojs/svelte";

import react from "@astrojs/react";

import vue from "@astrojs/vue";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://nonacademic.net",

  integrations: [sitemap(), svelte(), react(), vue()],

  build: {
    format: "file",
  },
});