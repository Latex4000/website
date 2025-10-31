import cs16CssUrl from "./themes/cs16.css?url";
import cs16OverridesUrl from "./themes/cs16-overrides.css?url";
import latexCssUrl from "./themes/latex.css?url";
import latexOverridesUrl from "./themes/latex-overrides.css?url";
import monoCssUrl from "./themes/mono.css?url";
import monoOverridesUrl from "./themes/mono-overrides.css?url";
import sakuraCssUrl from "./themes/sakura.css?url";
import tufteCssUrl from "./themes/tufte.css?url";
import tufteOverridesUrl from "./themes/tufte-overrides.css?url";
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
            "--viz-grid":
                "color-mix(in srgb, var(--text-color) 15%, transparent)",
            "--viz-axis":
                "color-mix(in srgb, var(--text-color) 90%, transparent)",
            "--viz-focus":
                "color-mix(in srgb, var(--text-color) 70%, var(--background-color) 30%)",
            "--viz-series-palette": [
                "#0a0a0a,#191919,#2b2b2b,#3d3d3d,#4f4f4f,#626262,#767676,#8a8a8a,#9f9f9f,#b4b4b4",
                "#f4f4f4,#dddddd,#c7c7c7,#b0b0b0,#9a9a9a,#848484,#6d6d6d,#575757,#414141,#2c2c2c",
            ],
            "--viz-sequential-ramp": [
                "hsl(0 0% 82%)|hsl(0 0% 62%)|hsl(0 0% 45%)|hsl(0 0% 30%)|hsl(0 0% 12%)",
                "hsl(0 0% 88%)|hsl(0 0% 74%)|hsl(0 0% 58%)|hsl(0 0% 42%)|hsl(0 0% 26%)",
            ],
            "--feedback-accent": [
                "color-mix(in srgb, #272727 72%, var(--background-color) 28%)",
                "color-mix(in srgb, #e5e5e5 74%, var(--background-color) 26%)",
            ],
            "--feedback-helpful": [
                "color-mix(in srgb, #335e33 34%, var(--background-color) 66%)",
                "color-mix(in srgb, #7dcb7d 44%, var(--background-color) 56%)",
            ],
            "--feedback-harmful": [
                "color-mix(in srgb, #5e2f2f 34%, var(--background-color) 66%)",
                "color-mix(in srgb, #c96f6f 44%, var(--background-color) 56%)",
            ],
            "--feedback-neutral": [
                "color-mix(in srgb, #2f3f5e 34%, var(--background-color) 66%)",
                "color-mix(in srgb, #7ca2cf 44%, var(--background-color) 56%)",
            ],
            "--feedback-arrow": [
                "color-mix(in srgb, #272727 74%, transparent)",
                "color-mix(in srgb, #e5e5e5 74%, transparent)",
            ],
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
            "--viz-grid":
                "color-mix(in srgb, var(--text-color) 15%, transparent)",
            "--viz-axis":
                "color-mix(in srgb, var(--text-color) 90%, transparent)",
            "--viz-focus":
                "color-mix(in srgb, var(--text-color) 70%, var(--background-color) 30%)",
            "--viz-series-palette": [
                "#0f1f3a,#1f3354,#2f496f,#3f5f8b,#5175a7,#648abf,#779fd5,#8db3e3,#b8862a,#8f6b1e",
                "#dbe6f5,#c0d1e8,#a6bad9,#8ca4ca,#728dba,#5a76a4,#425e89,#2c4268,#e1bb6a,#b7924d",
            ],
            "--viz-sequential-ramp": [
                "hsl(214 50% 88%)|hsl(214 60% 70%)|hsl(214 65% 54%)|hsl(214 70% 40%)|hsl(214 74% 28%)",
                "hsl(214 60% 28%)|hsl(213 58% 38%)|hsl(212 55% 50%)|hsl(210 58% 62%)|hsl(206 62% 74%)",
            ],
            "--feedback-accent":
                "color-mix(in srgb, #244066 48%, var(--background-color) 52%)",
            "--feedback-helpful":
                "color-mix(in srgb, #255443 34%, var(--background-color) 66%)",
            "--feedback-harmful":
                "color-mix(in srgb, #6a2d35 34%, var(--background-color) 66%)",
            "--feedback-neutral":
                "color-mix(in srgb, #28486d 36%, var(--background-color) 64%)",
            "--feedback-arrow":
                "color-mix(in srgb, #244066 70%, transparent)",
            "--webring-prev-icon": '"←"',
            "--webring-next-icon": '"→"',
            "--srclink": "https://latex.vercel.app/",
            "--srctext": "Design implemented from LaTeX.css",
        } satisfies ThemeValues,
    }),
    defineThemeGroup({
        slug: ["sakura", "sakura-dark"] as const,
        name: ["Sakura", "Sakura dark"] as const,
        cssUrls: [sakuraCssUrl] as const,
        values: {
            "--layout-header-margin-block": "0",
            "--layout-footer-font-scale": "0.85em",
            "--layout-max-width": "calc(min(38em, round(down, 100%, 1ch)))",
            "--layout-padding-inline": "13px",
            "--sidebar-max-width": "calc(min(30ch, round(down, 100%, 1ch)))",
            "--home-grid-margin-block-start": "0",
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
            "--space-inline-sm": "1.4rem",
            "--space-inline-md": "2.4rem",
            "--space-static-xs": "0.5rem",
            "--space-static-sm": "0.75rem",
            "--space-static-md": "1rem",
            "--line-height": "1.618rem",
            "--font-size-sm": "0.85rem",
            "--font-size-lg": "1.6rem",
            "--border-thickness": "1px",
            "--border-thickness-thin": "calc(var(--border-thickness) / 2)",
            "--border-thickness-thick": "calc(var(--border-thickness) * 1.5)",
            "--border-radius-sm": "2px",
            "--border-radius-md": "4px",
            "--background-color": ["#f9f9f9", "#222222"],
            "--background-color-alt": [
                "color-mix(in srgb, #f9f9f9 85%, #4a4a4a 15%)",
                "color-mix(in srgb, #222222 80%, #4a4a4a 20%)",
            ],
            "--text-color": ["#4a4a4a", "#c9c9c9"],
            "--text-color-alt": ["#4a4a4a", "#e6e6e6"],
            "--border-color-muted": [
                "color-mix(in srgb, #4a4a4a 12%, #f9f9f9 88%)",
                "color-mix(in srgb, #c9c9c9 22%, #222222 78%)",
            ],
            "--surface-overlay": [
                "color-mix(in srgb, #4a4a4a 10%, #f9f9f9 90%)",
                "color-mix(in srgb, #c9c9c9 25%, #222222 75%)",
            ],
            "--surface-overlay-strong": [
                "color-mix(in srgb, #4a4a4a 18%, #f9f9f9 82%)",
                "color-mix(in srgb, #c9c9c9 40%, #222222 60%)",
            ],
            "--text-on-overlay": ["#222222", "#f9f9f9"],
            "--viz-grid": [
                "color-mix(in srgb, #4a4a4a 15%, transparent)",
                "color-mix(in srgb, #c9c9c9 15%, transparent)",
            ],
            "--viz-axis": [
                "color-mix(in srgb, #4a4a4a 80%, transparent)",
                "color-mix(in srgb, #c9c9c9 85%, transparent)",
            ],
            "--viz-focus": [
                "color-mix(in srgb, #982c61 60%, #f9f9f9 40%)",
                "color-mix(in srgb, #c9c9c9 70%, #222222 30%)",
            ],
            "--viz-series-palette": [
                "#1d7484,#982c61,#4a4a4a,#5aa5b4,#c95f9d,#6c4f8a,#f2cadc,#88a196,#d991bc,#3c6e71",
                "#d1e8ef,#f0b1ce,#c9c9c9,#8acdd7,#f3cce1,#b7a4dd,#6fb7bc,#f4a5bf,#e7d6f3,#9fd4d9",
            ],
            "--viz-sequential-ramp": [
                "hsl(194 65% 46%)|hsl(280 40% 52%)|hsl(210 18% 42%)|hsl(24 55% 58%)|hsl(320 48% 66%)",
                "hsl(194 50% 74%)|hsl(280 45% 70%)|hsl(210 14% 64%)|hsl(24 55% 68%)|hsl(320 48% 78%)",
            ],
            "--feedback-accent": [
                "color-mix(in srgb, #982c61 45%, #f9f9f9 55%)",
                "color-mix(in srgb, #c9c9c9 50%, #222222 50%)",
            ],
            "--feedback-helpful": [
                "color-mix(in srgb, #3c8f73 40%, #f9f9f9 60%)",
                "color-mix(in srgb, #7fd4af 55%, #222222 45%)",
            ],
            "--feedback-harmful": [
                "color-mix(in srgb, #b35656 40%, #f9f9f9 60%)",
                "color-mix(in srgb, #e09393 50%, #222222 50%)",
            ],
            "--feedback-neutral": [
                "color-mix(in srgb, #1d7484 40%, #f9f9f9 60%)",
                "color-mix(in srgb, #8ec3cf 55%, #222222 45%)",
            ],
            "--feedback-arrow": [
                "color-mix(in srgb, #1d7484 70%, transparent)",
                "color-mix(in srgb, #c9c9c9 70%, transparent)",
            ],
            "--webring-prev-icon": '"←"',
            "--webring-next-icon": '"→"',
            "--srclink": "https://github.com/oxalorg/sakura",
            "--srctext": "Design implemented from Sakura.css",
        } satisfies ThemeValues,
    }),
    defineThemeGroup({
        slug: ["tufte"] as const,
        name: ["Tufte"] as const,
        cssUrls: [tufteCssUrl, tufteOverridesUrl] as const,
        values: {
            "--layout-header-margin-block": "2lh",
            "--layout-footer-font-scale": "0.85em",
            "--layout-max-width": "calc(min(68ch, round(down, 100%, 1ch)))",
            "--layout-padding-inline": "1.5rem",
            "--sidebar-max-width": "calc(min(26ch, round(down, 100%, 1ch)))",
            "--home-grid-margin-block-start": "1.25lh",
            "--home-grid-row-gap": "1lh",
            "--home-grid-width": "round(down, 100%, 6ch)",
            "--sights-grid-margin-block-start": "1rem",
            "--media-cover-size-lg": "12lh",
            "--media-cover-size-md": "8lh",
            "--media-cover-size-sm": "5lh",
            "--media-cover-size-xs": "3lh",
            "--media-video-width": "16lh",
            "--media-video-height": "9lh",
            "--space-2xs": "calc(var(--line-height) / 4)",
            "--space-xs": "calc(var(--line-height) / 2)",
            "--space-sm": "calc(var(--line-height) * 0.9)",
            "--space-md": "calc(var(--line-height) * 1.8)",
            "--space-lg": "calc(var(--line-height) * 2.4)",
            "--space-inline-sm": "1.5ch",
            "--space-inline-md": "3ch",
            "--space-static-xs": "0.5rem",
            "--space-static-sm": "0.875rem",
            "--space-static-md": "1.25rem",
            "--line-height": "1.4rem",
            "--font-size-sm": "0.8rem",
            "--font-size-lg": "1.6rem",
            "--border-thickness": "1px",
            "--border-thickness-thin": "calc(var(--border-thickness) / 2)",
            "--border-thickness-thick": "calc(var(--border-thickness) * 2)",
            "--border-radius-sm": "2px",
            "--border-radius-md": "6px",
            "--background-color": "#151515",
            "--background-color-alt": "#202020",
            "--text-color": "#dddddd",
            "--text-color-alt": "#c4c4c4",
            "--border-color-muted":
                "color-mix(in srgb, var(--text-color) 16%, var(--background-color) 84%)",
            "--surface-overlay":
                "color-mix(in srgb, var(--text-color) 18%, transparent)",
            "--surface-overlay-strong":
                "color-mix(in srgb, var(--text-color) 32%, transparent)",
            "--text-on-overlay": "#f7f7f7",
            "--viz-grid":
                "color-mix(in srgb, var(--text-color) 20%, transparent)",
            "--viz-axis":
                "color-mix(in srgb, var(--text-color) 82%, transparent)",
            "--viz-focus":
                "color-mix(in srgb, #a2c8ff 60%, var(--background-color) 40%)",
            "--viz-series-palette":
                "#b4d2f0,#8fbcdc,#6fa6c4,#578fad,#417896,#2f617f,#1f4b69,#143754,#0c263f,#08162a",
            "--viz-sequential-ramp":
                "hsl(201 28% 30%)|hsl(201 32% 42%)|hsl(201 40% 54%)|hsl(201 50% 66%)|hsl(201 62% 78%)",
            "--feedback-accent":
                "color-mix(in srgb, #91b7ff 55%, var(--background-color) 45%)",
            "--feedback-helpful":
                "color-mix(in srgb, #78c48a 55%, var(--background-color) 45%)",
            "--feedback-harmful":
                "color-mix(in srgb, #d68171 55%, var(--background-color) 45%)",
            "--feedback-neutral":
                "color-mix(in srgb, #9e94c7 55%, var(--background-color) 45%)",
            "--feedback-arrow":
                "color-mix(in srgb, #bcd7ff 70%, transparent)",
            "--webring-prev-icon": '"←"',
            "--webring-next-icon": '"→"',
            "--srclink": "https://edwardtufte.github.io/tufte-css/",
            "--srctext": "Design implemented from Tufte CSS by Dave Liepmann",
        } satisfies ThemeValues,
    }),
    defineThemeGroup({
        slug: ["cs16"] as const,
        name: ["CS 1.6"] as const,
        cssUrls: [cs16CssUrl, cs16OverridesUrl] as const,
        values: {
            "--layout-header-margin-block": "1lh",
            "--layout-footer-font-scale": "0.8em",
            "--layout-max-width": "800px",
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
            "--font-size-sm": "16px",
            "--font-size-lg": "24px",
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
            "--viz-grid":
                "color-mix(in srgb, var(--text-color) 18%, transparent)",
            "--viz-axis":
                "color-mix(in srgb, var(--text-color) 92%, transparent)",
            "--viz-focus":
                "color-mix(in srgb, var(--text-color) 65%, var(--background-color) 35%)",
            "--viz-series-palette":
                "#133416,#1f4a23,#2c6131,#3a7a40,#4b944f,#5cab61,#70c275,#87d88d,#a4efaa,#d0ffe0",
            "--viz-sequential-ramp":
                "hsl(124 38% 18%)|hsl(120 44% 32%)|hsl(116 52% 48%)|hsl(110 60% 64%)|hsl(102 68% 80%)",
            "--feedback-accent":
                "color-mix(in srgb, #8ad04e 56%, var(--background-color) 44%)",
            "--feedback-helpful":
                "color-mix(in srgb, #56c77f 46%, var(--background-color) 54%)",
            "--feedback-harmful":
                "color-mix(in srgb, #d77249 44%, var(--background-color) 56%)",
            "--feedback-neutral":
                "color-mix(in srgb, #4fa287 44%, var(--background-color) 56%)",
            "--feedback-arrow":
                "color-mix(in srgb, #c8f7d4 74%, transparent)",
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