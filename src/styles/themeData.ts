import { createThemes } from "./createThemes";
import { applyThemeFromSlug, valuesToString } from "./themeClient";
import { themeGroups } from "./themes/config";

const expandedThemes = themeGroups.flatMap((group) => createThemes(group));

export const themes = expandedThemes;
export const defaultTheme = expandedThemes.find(({ slug }) => slug === "mono")!;
export const defaultDarkTheme = expandedThemes.find(
    ({ slug }) => slug === "mono-dark",
)!;

export function ssrStyle(): string {
    return `
        :root { ${valuesToString(defaultTheme.values)} }

        @media (prefers-color-scheme: dark) {
            :root { ${valuesToString(defaultDarkTheme.values)} }
        }
    `;
}

export function applyTheme(themeSlug: string): void {
    applyThemeFromSlug(themes, themeSlug);
}
