import type { AstroIntegration } from "astro";
import type { Plugin, ResolvedConfig } from "vite";

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
            "astro:config:setup": ({ updateConfig }) => {
                updateConfig({
                    vite: {
                        plugins: [viteInlineBundle()],
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

function viteInlineBundle(): Plugin {
    let resolvedConfig: ResolvedConfig | undefined;

    return {
        name: "latex4000:inline-bundle",
        configResolved(config) {
            resolvedConfig = config;
        },
        load: {
            filter: { id: moduleSuffixRegex },
            handler(id) {
                id = id.replace(moduleSuffixRegex, "");

                this.addWatchFile(id);
                this.info(`Building new bundle with entrypoint "${id}"`);

                return `export default ${JSON.stringify(createIIFEBundle(id))}`;
            },
        },
    };
}

/**
 * @returns JavaScript code in IIFE format.
 */
function createIIFEBundle(moduleId: string): string {
    return "";
}
