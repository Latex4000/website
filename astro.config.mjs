// @ts-check
import { defineConfig } from "astro/config";
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
        svelte(),
        react(),
        vue(),
        mdx(),
        {
            name: "latex4000:delete-session-config",
            hooks: {
                "astro:config:setup": ({ config }) => {
                    delete config.session;
                },
            },
        },
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

    // This is a dummy session config to make the Node integration skip its own logic related to providing a default session config. It is later deleted from config in the integration above
    session: {
        driver: "fs-lite",
    },
});
