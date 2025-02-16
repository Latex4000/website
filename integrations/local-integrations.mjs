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
const hook = async (options) => {
    const integrationEntries = await readdir("integrations", { withFileTypes: true });

    for (const integrationEntry of integrationEntries) {
        if (!integrationEntry.isDirectory()) {
            continue;
        }

        const integrationPath = join("integrations", integrationEntry.name);

        if (await access(join(integrationPath, "package.json")).catch(() => true)) {
            continue;
        }

        if (await access(join(integrationPath, "node_modules")).catch(() => true)) {
            execFileSync("npm", ["install"], { cwd: integrationPath, stdio: "inherit" });
        }

        if (await access(join(integrationPath, "dist")).catch(() => true)) {
            execFileSync("npm", ["run", "build"], { cwd: integrationPath, stdio: "inherit" });
        }

        /** @type {{ default: () => AstroIntegration }} */
        const integration = await import(join(resolve(integrationPath), "dist/index.js"));

        options.updateConfig({ integrations: [integration.default()] });
    }
};
