import type { AstroIntegration } from "astro";

export default function prerenderEnv(): AstroIntegration {
    return {
        name: "latex4000:prerender-env",
        hooks: {
            "astro:build:start": () => {
                process.env.PRERENDERING = "1";
            },
        },
    };
}
