import type { AstroIntegration } from "astro";

/**
 * Configure vite to handle theme scripts
 */
export default function theme(): AstroIntegration {
    return {
        name: "latex4000:theme",
        hooks: {
            "astro:build:setup": ({ logger, vite }) => {
                if (vite.build == null) {
                    logger.error("Vite build options are undefined");
                    return;
                }

                if ("assetsInlineLimit" in vite.build) {
                    logger.error("assetsInlineLimit is already defined in Vite build options");
                    return;
                }

                // Make sure that all non-module javascript in ThemeInit is inlined
                vite.build.assetsInlineLimit = (path) => {
                    if (path.includes("ThemeInit.astro") && path.endsWith("js")) {
                        return true;
                    }

                    return undefined;
                };
            },
        },
    };
}
