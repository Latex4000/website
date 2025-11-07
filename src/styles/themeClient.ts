import { defaultDarkTheme, defaultTheme, themes } from "./config";

function valuesToString(values: Record<`--${string}`, string>): string {
    return Object.entries(values)
        .map(([key, value]) => `${key}: ${value};`)
        .join("");
}

export const noScriptStyle = `
    :root { ${valuesToString(defaultTheme.values)} }

    @media (prefers-color-scheme: dark) {
        :root { ${valuesToString(defaultDarkTheme.values)} }
    }
`;

// Keep in sync with ThemeInit applyTheme
export function applyTheme(themeSlug: string): void {
    if (document.body.dataset.theme === themeSlug) {
        return;
    }

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
        "style-source"
    ) as HTMLAnchorElement | null;
    if (styleSource != null) {
        styleSource.href = theme.values["--srclink"];
        styleSource.textContent = theme.values["--srctext"];
    }

    // Send event for pages that use JS to compute style-dependent features
    window.dispatchEvent(
        new CustomEvent("themechange", { detail: { slug: theme.slug } }),
    );
}
