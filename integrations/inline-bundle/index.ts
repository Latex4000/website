import { join, relative } from "node:path";
import type { AstroIntegration } from "astro";
import type { PluginContext } from "rollup";
import {
    build,
    type InlineConfig,
    type Plugin,
    type ResolvedConfig,
} from "vite";

const moduleSuffix = "inline-bundle";
const moduleSuffixRegex = new RegExp(`\\?${moduleSuffix}$`);

const moduleSuffixTypeDeclaration = `\
/**
 * The \`${moduleSuffix}\` query string causes this module to be separately bundled in IIFE format and exported as a string.
 */
declare module "*?${moduleSuffix}" {
    /**
     * JavaScript code in IIFE format.
     */
    const src: string;
    export default src;
}
`;

export default function inlineBundle(): AstroIntegration {
    return {
        name: "latex4000:inline-bundle",
        hooks: {
            "astro:config:setup": ({ createCodegenDir, updateConfig }) => {
                updateConfig({
                    vite: {
                        plugins: [
                            viteInlineBundle(createCodegenDir().pathname),
                        ],
                    },
                });
            },
            "astro:config:done": ({ injectTypes }) => {
                injectTypes({
                    filename: `${moduleSuffix}-module.d.ts`,
                    content: moduleSuffixTypeDeclaration,
                });
            },
        },
    };
}

function viteInlineBundle(codegenDir: string): Plugin {
    let resolvedConfig: ResolvedConfig | undefined;

    return {
        name: "latex4000:inline-bundle",

        // Store the resolved Vite config for later use
        configResolved(config) {
            resolvedConfig = config;
        },

        // Resolve the module ID without the suffix, then re-attach the suffix so it can be matched in the load hook
        resolveId: {
            order: "pre",
            filter: {
                id: {
                    include: moduleSuffixRegex,
                    exclude: /^\0/,
                },
            },
            async handler(source, importer, options) {
                if (!options.ssr) {
                    this.error(
                        `${moduleSuffix} modules are only valid in SSR context`,
                    );
                }

                const resolvedId = await this.resolve(
                    source.replace(moduleSuffixRegex, ""),
                    importer,
                    options,
                );

                if (resolvedId == null) {
                    this.error(
                        `Could not resolve ${moduleSuffix} module "${source}"`,
                    );
                }

                return `\0${resolvedId.id}?${moduleSuffix}`;
            },
        },

        // Load the module by building it separately and exporting its contents as a string
        load: {
            filter: {
                id: {
                    include: moduleSuffixRegex,
                    exclude: /^[^\0]/,
                },
            },
            async handler(id, options) {
                if (resolvedConfig == null) {
                    this.error("Missing resolved config");
                }

                if (!options?.ssr) {
                    this.error(
                        `${moduleSuffix} modules are only valid in SSR context`,
                    );
                }

                id = id.slice(1).replace(moduleSuffixRegex, "");

                this.addWatchFile(id);
                this.info(`Building bundle with entrypoint "${id}"`);

                const code = await createIIFEBundle.call(
                    this,
                    id,
                    join(codegenDir, `vite-cache-${id}`),
                    resolvedConfig,
                );

                // Empty mapping as recommended by
                // https://rollupjs.org/plugin-development/#source-code-transformations
                return {
                    code: `export default ${JSON.stringify(code)}`,
                    map: { mappings: "" },
                };
            },
        },
    };
}

/**
 * Manually maps `?url` modules to their development IDs instead of production.
 */
function viteFixDevUrl(): Plugin {
    return {
        name: "latex4000:inline-bundle-fix-dev-url",

        resolveId: {
            order: "pre",
            filter: { id: /\?url$/ },
            async handler(source, importer, options) {
                const resolvedId = await this.resolve(
                    source.slice(0, -4),
                    importer,
                    options,
                );

                if (resolvedId == null) {
                    this.error(`Could not resolve url module "${source}"`);
                }

                const url = "/" + relative(process.cwd(), resolvedId.id);

                return `\0${url}LATEX_DEV_URL`;
            },
        },

        load: {
            filter: { id: /^\0.*LATEX_DEV_URL$/ },
            handler(id) {
                return `export default ${JSON.stringify(id.slice(1, -13))}`;
            },
        },
    };
}

/**
 * @returns JavaScript code in IIFE format.
 */
async function createIIFEBundle(
    this: PluginContext,
    moduleId: string,
    viteCacheDir: string,
    viteResolvedConfig: ResolvedConfig,
): Promise<string> {
    const iifeConfig: InlineConfig = {
        ...viteResolvedConfig.inlineConfig,
        build: {
            ...viteResolvedConfig.inlineConfig.build,
            minify: viteResolvedConfig.command === "build",
            rollupOptions: {
                input: moduleId,
                output: { format: "iife" },
                treeshake: true,
            },
            target: "es6",
            write: false,
        },
        cacheDir: viteCacheDir, // Might not be necessary but seemed wrong to share the cache with this separate type of build
        clearScreen: false,
        configFile: false,
        logLevel: "silent",
        plugins: [viteResolvedConfig.command === "serve" && viteFixDevUrl()],
    };
    delete iifeConfig.customLogger;

    const iifeBuildResult = await build(iifeConfig);

    if (!("output" in iifeBuildResult)) {
        this.error("Invalid Vite build result");
    }

    if (iifeBuildResult.output.slice(1).some((f) => f.type !== "asset")) {
        this.error("More than one chunk in build result");
    }

    return iifeBuildResult.output[0].code;
}
