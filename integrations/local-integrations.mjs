import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, lstat, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

/** @typedef {import("astro").AstroIntegration} AstroIntegration */

/**
 * Build and include local Astro integrations.
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
const hook = async ({ createCodegenDir, logger, updateConfig }) => {
    const codegenDir = createCodegenDir().pathname;
    const integrationEntries = await readdir("integrations", {
        withFileTypes: true,
    });

    for (const integrationEntry of integrationEntries) {
        if (!integrationEntry.isDirectory()) {
            continue;
        }

        const integrationPath = join("integrations", integrationEntry.name);
        const integrationSrcHashPath = join(
            codegenDir,
            `src-hash-${integrationEntry.name}`,
        );

        if (
            await integrationNeedsBuild(integrationPath, integrationSrcHashPath)
        ) {
            logger.info(`Building "${integrationEntry.name}"`);

            execFileSync("tsc", { cwd: integrationPath, stdio: "inherit" });

            await writeFile(
                integrationSrcHashPath,
                await hashIntegrationSrc(integrationPath),
            );
        }

        try {
            /** @type {{ default: () => AstroIntegration }} */
            const integrationModule = await import(
                join(resolve(integrationPath), "dist/index.js")
            );
            const integration = integrationModule.default();

            updateConfig({ integrations: [integration] });

            logger.info(`Loaded ${integration.name}`);
        } catch {
            logger.error(
                `Failed to load "${integrationEntry.name}", make sure the default export of ${join(integrationPath, "index.ts")} is of type () => AstroIntegration`,
            );
        }
    }
};

/**
 * @param {string} path
 * @param {string} srcHashPath
 * @returns {Promise<boolean>}
 */
async function integrationNeedsBuild(path, srcHashPath) {
    if (await access(join(path, "tsconfig.json")).catch(() => true)) {
        return false;
    }

    if (await access(srcHashPath).catch(() => true)) {
        return true;
    }

    return (
        (await readFile(srcHashPath, "utf8")) !==
        (await hashIntegrationSrc(path))
    );
}

/**
 * Get a hash of an integration directory using its source files' paths and modification times.
 * @param {string} path
 * @returns {Promise<string>}
 */
async function hashIntegrationSrc(path) {
    const hash = createHash("md5");
    const stats = await collectStats(path);

    for (const stat of stats) {
        if (stat.path === path) {
            continue;
        }

        hash.update(stat.path);
        hash.update(stat.mtime.toString(16));
    }

    return hash.digest("hex");

    /**
     * @param {string} path
     * @returns {Promise<{ path: string; mtime: bigint }[]>}
     */
    async function collectStats(path) {
        if (basename(path) === "dist") {
            return [];
        }

        const stats = await lstat(path, { bigint: true });

        if (stats.isDirectory()) {
            const paths = (await readdir(path)).map((filename) =>
                join(path, filename),
            );
            const childStats = await Promise.all(paths.map(collectStats));

            return [{ path, mtime: stats.mtimeMs }, ...childStats.flat()];
        } else if (stats.isFile()) {
            return [{ path, mtime: stats.mtimeMs }];
        }

        throw new Error();
    }
}
