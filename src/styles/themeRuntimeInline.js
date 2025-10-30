/* eslint-env browser */
/* global document, window */

(function initThemeRuntime() {
    const initScript = document.querySelector("script[data-theme-init]");

    if (!initScript || !initScript.textContent) {
        return;
    }

    /* ------------------------- Theme payload ------------------------- */

    /** @type {{ defaultDarkTheme: import('./createThemes').Theme; defaultTheme: import('./createThemes').Theme; themes: import('./createThemes').Theme[] }} */
    // Theme data comes from the inline JSON emitted by ThemeInit.astro.
    const payload = JSON.parse(initScript.textContent);
    const { defaultDarkTheme, defaultTheme, themes } = payload;
    // Precompute slug lookups so applyTheme stays cheap.
    const themeBySlug = new Map(themes.map((theme) => [theme.slug, theme]));

    const STORAGE_KEY = "theme-slug";

    /* ---------------------- DOM transformation ---------------------- */

    const valuesToString = (values) =>
        Object.entries(values)
            .map(([key, value]) => `${key}: ${value};`)
            .join(" ");

    const removeOldThemeNodes = () => {
        document.head.querySelectorAll("[data-theme]").forEach((node) => node.remove());
    };

    const injectThemeNodes = (theme) => {
        const style = document.createElement("style");
        style.dataset.theme = "";
        style.textContent = `:root { ${valuesToString(theme.values)} }`;

        const resources = [style, ...theme.cssUrls.map((url) => {
            const link = document.createElement("link");
            link.dataset.theme = "";
            link.rel = "stylesheet";
            link.href = url;
            return link;
        })];

        document.head.append(...resources);
    };

    const applyBodyTheme = (theme) => {
        const setBody = () => {
            if (!document.body) {
                return false;
            }

            document.body.dataset.theme = theme.slug;
            return true;
        };

        if (setBody()) {
            return;
        }

        const onReady = () => {
            if (setBody()) {
                document.removeEventListener("DOMContentLoaded", onReady);
            }
        };

        document.addEventListener("DOMContentLoaded", onReady);
    };

    const updateStyleSourceLink = (theme) => {
        const styleSource = document.getElementById("style-source");

        if (styleSource && styleSource.tagName === "A") {
            styleSource.href = theme.values["--srclink"] ?? styleSource.href;
            styleSource.textContent = theme.values["--srctext"] ?? styleSource.textContent;
        }
    };

    // Swap in the selected theme and sync every dependent surface.
    const renderTheme = (theme) => {
        removeOldThemeNodes();
        injectThemeNodes(theme);
        applyBodyTheme(theme);
        updateStyleSourceLink(theme);
    };

    /* ---------------------- Theme selection logic ------------------- */

    // Restore the user's choice when possible; fall back to system preference.
    const resolveInitialTheme = () => {
        const storedSlug = window.localStorage.getItem(STORAGE_KEY);
        if (storedSlug) {
            const storedTheme = themeBySlug.get(storedSlug);
            if (storedTheme) {
                return storedTheme;
            }
        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? defaultDarkTheme : defaultTheme;
    };

    const runtime = {
        applyTheme(themeSlug) {
            const theme = themeBySlug.get(themeSlug);
            if (theme) {
                renderTheme(theme);
            }
        },
    };

    window.__themeRuntime = runtime;
    renderTheme(resolveInitialTheme());
})();
