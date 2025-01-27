import type { Settings } from "nottheme";

export default {
    options: {
        "color-scheme": {
            name: "",
            choices: ["light", "dark"],
            values: {
                light: {
                    "--text-color": "#000",
                    "--text-color-alt": "#666",
                    "--background-color": "#fff",
                    "--background-color-alt": "#eee",
                },
                dark: {
                    "--text-color": "#fff",
                    "--text-color-alt": "#aaa",
                    "--background-color": "#000",
                    "--background-color-alt": "#111",
                },
            },
            default: [
                { query: "(prefers-color-scheme: dark)", choice: "dark" },
                "light",
            ]
        }
    }
} satisfies Settings;