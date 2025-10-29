import { requiredCssKeys, type RequiredCssKey } from "./themeContract";

type CssValue = number | string | null;
type CssValueOrArray = CssValue | CssValue[];

export type ThemeValueDefinition = Record<RequiredCssKey, CssValueOrArray>;

export function defineThemeValues<T extends ThemeValueDefinition>(
    values: T,
): T {
    return values;
}

export interface Theme {
    cssUrls: string[];
    name: string;
    slug: string;
    values: Record<RequiredCssKey, string> & Record<`--${string}`, string>;
}

export default function createThemes(
    slug: string[],
    name: string[],
    cssUrls: string[],
    values: ThemeValueDefinition,
): Theme[] {
    if (name.length !== slug.length) {
        throw new Error("Invalid theme");
    }

    const themes: Theme[] = [];

    for (let i = 0; i < name.length; i++) {
        themes.push({
            cssUrls,
            name: name[i]!,
            slug: slug[i]!,
            values: {} as Record<RequiredCssKey, string>,
        });
    }

    for (const [key, value] of Object.entries(values)) {
        if (value == null) {
            continue;
        }

        if (!Array.isArray(value)) {
            for (const theme of themes) {
                theme.values[key as `--${string}`] = String(value);
            }

            continue;
        }

        if (value.length > themes.length) {
            throw new Error("Invalid theme");
        }

        for (let i = 0; i < value.length; i++) {
            if (value[i] != null) {
                themes[i]!.values[key as `--${string}`] = String(value[i]);
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
