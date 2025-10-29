type CssValue = number | string | null;
type CssValueOrArray = CssValue | CssValue[];

type RequiredCssKeys =
    | "--background-color"
    | "--background-color-alt"
    | "--border-color-muted"
    | "--border-thickness"
    | "--home-grid-margin-block-start"
    | "--home-grid-row-gap"
    | "--home-grid-width"
    | "--layout-max-width"
    | "--layout-padding-inline"
    | "--space-2xs"
    | "--space-xs"
    | "--space-sm"
    | "--space-md"
    | "--space-lg"
    | "--space-inline-sm"
    | "--space-inline-md"
    | "--space-static-xs"
    | "--space-static-sm"
    | "--space-static-md"
    | "--font-size-sm"
    | "--font-size-lg"
    | "--border-radius-sm"
    | "--border-radius-md"
    | "--border-thickness-thin"
    | "--border-thickness-thick"
    | "--media-cover-size-lg"
    | "--media-cover-size-md"
    | "--media-cover-size-sm"
    | "--media-cover-size-xs"
    | "--media-video-height"
    | "--media-video-width"
    | "--sidebar-max-width"
    | "--line-height"
    | "--layout-footer-font-scale"
    | "--layout-header-margin-block"
    | "--sights-grid-margin-block-start"
    | "--srclink"
    | "--srctext"
    | "--surface-overlay"
    | "--surface-overlay-strong"
    | "--text-color"
    | "--text-color-alt"
    | "--text-on-overlay"
    | "--webring-next-icon"
    | "--webring-prev-icon";

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
    values: Record<RequiredCssKeys, CssValueOrArray>,
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
