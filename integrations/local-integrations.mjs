import { execFileSync } from "node:child_process";
import { access, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

/** @typedef {import("astro").AstroIntegration} AstroIntegration */

/**
 * Build and include local Astro integrations
 *
 * @returns {AstroIntegration}
 */
export default function localIntegrations() {
    return {
        name: "latex4000:local-integrations",
        hooks: {
            "astro:config:setup": hook,
        },
    };
}

/** @type {AstroIntegration["hooks"]["astro:config:setup"]} */
const hook = async ({ logger, updateConfig }) => {
    const integrationEntries = await readdir("integrations", { withFileTypes: true });

    for (const integrationEntry of integrationEntries) {
        if (!integrationEntry.isDirectory()) {
            continue;
        }

        const integrationPath = join("integrations", integrationEntry.name);

        if (await access(join(integrationPath, "tsconfig.json")).catch(() => true)) {
            continue;
        }

        if (await access(join(integrationPath, "dist")).catch(() => true)) {
            logger.info(`Building ${integrationPath}`);

            execFileSync("tsc", ["-p", integrationPath], { stdio: "inherit" });
        }

        /** @type {{ default: () => AstroIntegration }} */
        const integrationModule = await import(join(resolve(integrationPath), "dist/index.js"));
        const integration = integrationModule.default();

        updateConfig({ integrations: [integration] });

        logger.info(`Loaded ${integration.name}`);
    }
};
