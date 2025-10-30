import type { Theme } from "./createThemes";

declare global {
    interface Window {
        __initialThemeSlug?: string;
    }
}

const initialAppliedSlug =
    typeof window !== "undefined"
        ? window.__initialThemeSlug ??
        (typeof document !== "undefined"
            ? document.body?.dataset.theme
            : undefined)
        : undefined;

let appliedThemeSlug: string | undefined = initialAppliedSlug;

export function valuesToString(
    values: Record<`--${string}`, string>,
): string {
    return Object.entries(values)
        .map(([key, value]) => `${key}: ${value};`)
        .join("");
}

export function applyThemeToDocument(theme: Theme): void {
    if (typeof document === "undefined") {
        return;
    }

    const existingThemeSlug = document.body?.dataset.theme;
    const hasThemeElements = document.head.querySelector("[data-theme]") != null;

    if (
        appliedThemeSlug === theme.slug &&
        existingThemeSlug === theme.slug &&
        hasThemeElements
    ) {
        return;
    }

    const prevHeadChildren = document.head.querySelectorAll("[data-theme]");

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

    prevHeadChildren.forEach((element) => element.remove());
    newHeadChildren.forEach((element) => document.head.appendChild(element));

    document.body.dataset.theme = theme.slug;

    const styleSource = document.getElementById("style-source") as
        | HTMLAnchorElement
        | null;
    if (styleSource) {
        styleSource.href = theme.values["--srclink"];
        styleSource.textContent = theme.values["--srctext"];
    }

    appliedThemeSlug = theme.slug;

    if (typeof window !== "undefined") {
        window.__initialThemeSlug = theme.slug;
    }
}

export function applyThemeFromSlug(
    themes: Theme[],
    themeSlug: string,
): Theme | undefined {
    const theme = themes.find(({ slug }) => slug === themeSlug);

    if (theme == null) {
        return undefined;
    }

    applyThemeToDocument(theme);
    return theme;
}
