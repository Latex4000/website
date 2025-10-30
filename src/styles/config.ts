import cs16CssUrl from "./themes/cs16.css?url";
import cs16OverridesUrl from "./themes/cs16-overrides.css?url";
import latexCssUrl from "./themes/latex.css?url";
import latexOverridesUrl from "./themes/latex-overrides.css?url";
import monoCssUrl from "./themes/mono.css?url";
import monoOverridesUrl from "./themes/mono-overrides.css?url";
import { requiredCssKeys, type RequiredCssKey } from "./themeContract";

type CssPrimitive = number | string;

export type ThemeValue =
    | CssPrimitive
    | null
    | readonly (CssPrimitive | null)[];

export type ThemeValues = {
    readonly [K in RequiredCssKey]: ThemeValue;
};

export interface ThemeGroupDefinition<
    Slugs extends readonly [string, ...string[]],
    Names extends readonly [string, ...string[]],
> {
    readonly slug: Slugs;
    readonly name: Names;
    readonly cssUrls: readonly string[];
    readonly values: ThemeValues;
}

export function defineThemeGroup<
    const Slugs extends readonly [string, ...string[]],
    const Names extends readonly [string, ...string[]],
>(
    definition: Names["length"] extends Slugs["length"]
        ? ThemeGroupDefinition<Slugs, Names>
        : never,
): ThemeGroupDefinition<Slugs, Names> {
    return definition;
}

export interface Theme {
    cssUrls: string[];
    name: string;
    slug: string;
    values: Record<RequiredCssKey, string> & Record<`--${string}`, string>;
}

export function createThemes(
    definition: ThemeGroupDefinition<
        readonly [string, ...string[]],
        readonly [string, ...string[]]
    >,
): Theme[] {
    const { cssUrls, name, slug, values } = definition;

    const themeCount = slug.length;
    const themes: Theme[] = [];

    for (let i = 0; i < themeCount; i++) {
        themes.push({
            cssUrls: Array.from(cssUrls, (url) => String(url)),
            name: name[i]!,
            slug: slug[i]!,
            values: {} as Theme["values"],
        });
    }

    const entries = Object.entries(values) as [
        RequiredCssKey,
        ThemeValue,
    ][];

    for (const [key, value] of entries) {
        if (value == null) {
            continue;
        }

        if (!Array.isArray(value)) {
            for (const theme of themes) {
                theme.values[key] = String(value);
            }

            continue;
        }

        if (value.length > themes.length) {
            throw new Error("Invalid theme definition: too many value entries.");
        }

        for (let i = 0; i < value.length; i++) {
            const entry = value[i];

            if (entry != null) {
                themes[i]!.values[key] = String(entry);
            }
        }
    }

    for (const theme of themes) {
        for (const key of requiredCssKeys) {
            if (!(key in theme.values)) {
                throw new Error(
                    `Theme "${theme.slug}" is missing required custom property "${key}".`,
                );
            }
        }
    }

    return themes;
}

export const themeGroups = [
    defineThemeGroup({
        slug: ["mono", "mono-dark"] as const,
        name: ["Mono", "Mono dark"] as const,
        cssUrls: [monoCssUrl, monoOverridesUrl] as const,
        values: {
            "--layout-header-margin-block": "1lh",
            "--layout-footer-font-scale": "1em",
            "--layout-max-width": "calc(min(80ch, round(down, 100%, 1ch)))",
            "--layout-padding-inline": "1.25rem",
            "--sidebar-max-width": "calc(min(30ch, round(down, 100%, 1ch)))",
            "--home-grid-margin-block-start": "0.5lh",
            "--home-grid-row-gap": "0.5lh",
            "--home-grid-width": "round(down, 100%, 5ch)",
            "--sights-grid-margin-block-start": "0",
            "--media-cover-size-lg": "11lh",
            "--media-cover-size-md": "8lh",
            "--media-cover-size-sm": "5lh",
            "--media-cover-size-xs": "3lh",
            "--media-video-width": "16lh",
            "--media-video-height": "9lh",
            "--space-2xs": "calc(var(--line-height) / 4)",
            "--space-xs": "calc(var(--line-height) / 2)",
            "--space-sm": "var(--line-height)",
            "--space-md": "calc(var(--line-height) * 1.5)",
            "--space-lg": "calc(var(--line-height) * 2)",
            "--space-inline-sm": "1ch",
            "--space-inline-md": "2ch",
            "--space-static-xs": "0.5rem",
            "--space-static-sm": "0.75rem",
            "--space-static-md": "1rem",
            "--line-height": "1.2rem",
            "--font-size-sm": "0.75rem",
            "--font-size-lg": "1.4rem",
            "--border-thickness": "2px",
            "--border-thickness-thin": "calc(var(--border-thickness) / 2)",
            "--border-thickness-thick": "calc(var(--border-thickness) * 1.5)",
            "--border-radius-sm": "2px",
            "--border-radius-md": "4px",
            "--background-color": ["#eee", "#111"],
            "--background-color-alt": ["#ddd", "#222"],
            "--text-color": ["#111", "#eee"],
            "--text-color-alt": ["#222", "#ddd"],
            "--border-color-muted":
                "color-mix(in srgb, var(--text-color) 15%, var(--background-color) 85%)",
            "--surface-overlay":
                "color-mix(in srgb, var(--text-color) 20%, transparent)",
            "--surface-overlay-strong":
                "color-mix(in srgb, var(--text-color) 35%, transparent)",
            "--text-on-overlay": ["#ffffff", "#111111"],
            "--webring-prev-icon": '"<--"',
            "--webring-next-icon": '"-->"',
            "--srclink": "https://owickstrom.github.io/the-monospace-web/",
            "--srctext": "Design implemented from The Monospace Web",
        } satisfies ThemeValues,
    }),
    defineThemeGroup({
        slug: ["latex", "latex-dark"] as const,
        name: ["LaTeX", "LaTeX dark"] as const,
        cssUrls: [latexCssUrl, latexOverridesUrl] as const,
        values: {
            "--layout-header-margin-block": "0",
            "--layout-footer-font-scale": "0.8em",
            "--layout-max-width": "80ch",
            "--layout-padding-inline": "1.25rem",
            "--sidebar-max-width": "calc(min(30ch, round(down, 100%, 1ch)))",
            "--home-grid-margin-block-start": "0",
            "--home-grid-row-gap": "0",
            "--home-grid-width": "100%",
            "--sights-grid-margin-block-start": "1rem",
            "--media-cover-size-lg": "11lh",
            "--media-cover-size-md": "8lh",
            "--media-cover-size-sm": "5lh",
            "--media-cover-size-xs": "3lh",
            "--media-video-width": "16lh",
            "--media-video-height": "9lh",
            "--space-2xs": "calc(var(--line-height) / 4)",
            "--space-xs": "calc(var(--line-height) / 2)",
            "--space-sm": "var(--line-height)",
            "--space-md": "calc(var(--line-height) * 1.5)",
            "--space-lg": "calc(var(--line-height) * 2)",
            "--space-inline-sm": "1ch",
            "--space-inline-md": "2ch",
            "--space-static-xs": "0.5rem",
            "--space-static-sm": "0.75rem",
            "--space-static-md": "1rem",
            "--line-height": "1rem",
            "--font-size-sm": "0.75rem",
            "--font-size-lg": "1.4rem",
            "--border-thickness": "1.36px",
            "--border-thickness-thin": "calc(var(--border-thickness) / 2)",
            "--border-thickness-thick": "calc(var(--border-thickness) * 1.5)",
            "--border-radius-sm": "2px",
            "--border-radius-md": "4px",
            "--background-color": [
                "hsl(210, 20%, 98%)",
                "hsl(0, 6.80%, 14.30%)",
            ],
            "--background-color-alt": [
                "hsl(210, 20%, 98%)",
                "hsl(0, 0%, 16%)",
            ],
            "--text-color": [
                "hsl(0, 5%, 10%)",
                "hsl(0, 0%, 86%)",
            ],
            "--text-color-alt": [
                "hsl(0, 5%, 10%)",
                "hsl(0, 0%, 86%)",
            ],
            "--border-color-muted":
                "color-mix(in srgb, var(--text-color) 15%, var(--background-color) 85%)",
            "--surface-overlay":
                "color-mix(in srgb, var(--text-color) 20%, transparent)",
            "--surface-overlay-strong":
                "color-mix(in srgb, var(--text-color) 35%, transparent)",
            "--text-on-overlay": ["#ffffff", "#111111"],
            "--webring-prev-icon": '"←"',
            "--webring-next-icon": '"→"',
            "--srclink": "https://latex.vercel.app/",
            "--srctext": "Design implemented from LaTeX.css",
        } satisfies ThemeValues,
    }),
    defineThemeGroup({
        slug: ["cs16"] as const,
        name: ["CS 1.6"] as const,
        cssUrls: [cs16CssUrl, cs16OverridesUrl] as const,
        values: {
            "--layout-header-margin-block": "1lh",
            "--layout-footer-font-scale": "0.8em",
            "--layout-max-width": "calc(min(80ch, round(down, 100%, 1ch)))",
            "--layout-padding-inline": "1.25rem",
            "--sidebar-max-width": "calc(min(30ch, round(down, 100%, 1ch)))",
            "--home-grid-margin-block-start": "0.5lh",
            "--home-grid-row-gap": "0",
            "--home-grid-width": "100%",
            "--sights-grid-margin-block-start": "0",
            "--media-cover-size-lg": "11lh",
            "--media-cover-size-md": "8lh",
            "--media-cover-size-sm": "5lh",
            "--media-cover-size-xs": "3lh",
            "--media-video-width": "16lh",
            "--media-video-height": "9lh",
            "--space-2xs": "calc(var(--line-height) / 4)",
            "--space-xs": "calc(var(--line-height) / 2)",
            "--space-sm": "var(--line-height)",
            "--space-md": "calc(var(--line-height) * 1.5)",
            "--space-lg": "calc(var(--line-height) * 2)",
            "--space-inline-sm": "1ch",
            "--space-inline-md": "2ch",
            "--space-static-xs": "0.5rem",
            "--space-static-sm": "0.75rem",
            "--space-static-md": "1rem",
            "--line-height": "1rem",
            "--font-size-sm": "0.75rem",
            "--font-size-lg": "1.4rem",
            "--border-thickness": "1px",
            "--border-thickness-thin": "calc(var(--border-thickness) / 2)",
            "--border-thickness-thick": "calc(var(--border-thickness) * 1.5)",
            "--border-radius-sm": "2px",
            "--border-radius-md": "4px",
            "--background-color": "#4a5942",
            "--background-color-alt": "#3e4637",
            "--text-color": "#dedfd6",
            "--text-color-alt": "#d8ded3",
            "--border-color-muted":
                "color-mix(in srgb, var(--text-color) 15%, var(--background-color) 85%)",
            "--surface-overlay":
                "color-mix(in srgb, var(--text-color) 20%, transparent)",
            "--surface-overlay-strong":
                "color-mix(in srgb, var(--text-color) 35%, transparent)",
            "--text-on-overlay": "#dedfd6",
            "--webring-prev-icon": '"<--"',
            "--webring-next-icon": '"-->"',
            "--srclink": "https://cs16.samke.me/",
            "--srctext": "Design implemented from cs16.css with font altered to Unifont",
        } satisfies ThemeValues,
    }),
] as const;

export type ThemeGroups = typeof themeGroups;

const themesCreated = themeGroups.flatMap((group) => createThemes(group));
export const themes = themesCreated;
export const defaultTheme = themesCreated.find(({ slug }) => slug === "mono")!;
export const defaultDarkTheme = themesCreated.find(
    ({ slug }) => slug === "mono-dark",
)!;