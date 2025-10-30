import type { Theme } from "./createThemes";

export interface ThemeRuntime {
    applyTheme(themeSlug: string): void;
}

export interface ThemeRuntimePayload {
    defaultDarkTheme: Theme;
    defaultTheme: Theme;
    themes: Theme[];
}

declare global {
    interface Window {
        __themeRuntime?: ThemeRuntime;
    }
}

export function setThemeRuntime(runtime: ThemeRuntime | undefined): void {
    if (typeof window === "undefined") {
        return;
    }

    if (runtime === undefined) {
        delete window.__themeRuntime;
        return;
    }

    window.__themeRuntime = runtime;
}

export function getThemeRuntime(): ThemeRuntime | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }

    return window.__themeRuntime;
}
