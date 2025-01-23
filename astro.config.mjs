// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import react from "@astrojs/react";
import vue from "@astrojs/vue";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import db from "@astrojs/db";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://nonacademic.net",

  integrations: [
    sitemap({
      filter: (page) => page !== "https://nonacademic.net/messages"
    }),
    svelte(),
    react(),
    vue(),
    mdx(),
    db()
  ],

  build: {
    format: "file",
  },

  adapter: node({
    mode: "standalone",
  }),

  security: {
    checkOrigin: false,
  }
});