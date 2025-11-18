import { themes as importedThemes, defaultTheme as importedDefaultTheme, defaultDarkTheme as importedDefaultDarkTheme } from "./config";

export const themes = importedThemes;
export const defaultTheme = importedDefaultTheme;
export const defaultDarkTheme = importedDefaultDarkTheme;

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
    const theme = themes.find(({ slug }) => slug === themeSlug);

    if (theme == null) {
        return;
    }

    // Query previous theme elements in <head>
    const prevHeadChildren = document.head.querySelectorAll("[data-theme]");

    // Create new theme elements
    const newHeadChildren: HTMLElement[] = [];

    const styleElement = document.createElement("style");
    styleElement.dataset.theme = "";
    styleElement.textContent = `:root { ${valuesToString(theme.values)} }`;
    newHeadChildren.push(styleElement);

    for (const cssUrl of theme.cssUrls) {
        const linkElement = document.createElement("link");
        linkElement.dataset.theme = "";
        linkElement.href = cssUrl;
        linkElement.rel = "stylesheet";
        newHeadChildren.push(linkElement);
    }

    // Remove previous theme elements
    prevHeadChildren.forEach((element) => element.remove());

    // Add new theme elements
    newHeadChildren.forEach((element) =>
        document.head.appendChild(element),
    );

    // Write theme slug to <body> dataset
    document.body.dataset.theme = theme.slug;

    // Set new style source link and text
    const styleSource = document.getElementById(
        "style-source",
    ) as HTMLAnchorElement;
    styleSource.href = theme.values["--srclink"];
    styleSource.textContent = theme.values["--srctext"];
}
