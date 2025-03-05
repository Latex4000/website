type CssValue = number | string | null;
type CssValueOrArray = CssValue | CssValue[];

type RequiredCssKeys =
    | "--background-color"
    | "--background-color-alt"
    | "--border-thickness"
    | "--line-height"
    | "--srclink"
    | "--srcopacity"
    | "--srctext"
    | "--text-color"
    | "--text-color-alt";

export interface Theme {
    cssUrls: string[];
    name: string;
    slug: string;
    values: Record<RequiredCssKeys, string> & Record<`--${string}`, string>;
}

export default function createThemes(
    slug: string[],
    name: string[],
    cssUrls: string[],
    values: Record<RequiredCssKeys, CssValueOrArray> & Record<`--${string}`, CssValueOrArray>,
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
            values: {} as Record<RequiredCssKeys, string>,
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

    return themes;
}
