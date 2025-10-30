import cs16 from "./themes/cs16";
import latex from "./themes/latex";
import mono from "./themes/mono";
import { getThemeRuntime } from "./themeRuntime";

export type { ThemeRuntime } from "./themeRuntime";

export const themes = [...mono, ...latex, ...cs16];
export const defaultTheme = mono[0]!;
export const defaultDarkTheme = mono[1]!;

function valuesToString(values: Record<`--${string}`, string>): string {
    return Object.entries(values)
        .map(([key, value]) => `${key}: ${value};`)
        .join("");
}

export function ssrStyle(): string {
    return `
        :root { ${valuesToString(defaultTheme.values)} }

        @media (prefers-color-scheme: dark) {
            :root { ${valuesToString(defaultDarkTheme.values)} }
        }
    `;
}

export function applyTheme(themeSlug: string): void {
    getThemeRuntime()?.applyTheme(themeSlug);
}
