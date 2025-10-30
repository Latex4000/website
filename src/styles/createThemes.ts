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

export default createThemes;
