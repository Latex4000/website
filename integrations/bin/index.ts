import type { AstroIntegration } from "astro";
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Add server entrypoints for bin scripts
 */
export default function bin(): AstroIntegration {
    return {
        name: "latex4000:bin",
        hooks: {
            "astro:build:setup": async ({ logger, target, vite }) => {
                if (target !== "server") {
                    return;
                }

                const rollupOptions = vite.build?.rollupOptions;

                if (rollupOptions == null) {
                    logger.error("Rollup options are undefined");
                    return;
                }

                const prevRollupInput = rollupOptions.input;

                // We need to add entries to the rollup input, which would normally require merging with its existing entries, but it turns out that at this point it's already empty. So just verify that it's empty instead
                if (!Array.isArray(prevRollupInput) || prevRollupInput.length !== 0) {
                    logger.error("Rollup input is not an empty array");
                    return;
                }

                const binDirectory = "src/bin";

                if (await access(binDirectory).catch(() => true)) {
                    return;
                }

                const binFiles = await readdir(binDirectory, {
                    recursive: true,
                    withFileTypes: true,
                });
                const rollupInput: Record<string, string> = {};

                logger.info("Adding entrypoints for:");

                for (const file of binFiles) {
                    if (!file.isFile()) {
                        continue;
                    }

                    const module = `bin/${file.name.replace(/\.[^.]+$/, "")}`;

                    rollupInput[module] = join(binDirectory, file.name);
                    logger.info(`dist/server/${module}.mjs`);
                }

                rollupOptions.input = rollupInput;
            },
        },
    };
}
