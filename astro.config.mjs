// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import react from "@astrojs/react";
import vue from "@astrojs/vue";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import localIntegrations from "./integrations/local-integrations.mjs";

// https://astro.build/config
export default defineConfig({
    output: "static",
    site: "https://nonacademic.net",

    integrations: [
        localIntegrations(),
        sitemap({
            filter: (page) => page !== "https://nonacademic.net/messages",
        }),
        svelte(),
        react(),
        vue(),
        mdx(),
    ],

    build: {
        format: "file",
    },

    adapter: node({
        mode: "standalone",
    }),

    security: {
        checkOrigin: false,
    },
});
