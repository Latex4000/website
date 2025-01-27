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
                    "--text-color-alt": "#ccc",
                    "--background-color": "#000",
                    "--background-color-alt": "#111",
                },
            },
            default: [
                { query: "(prefers-color-scheme: dark)", choice: "dark" },
                "light",
            ]
        },
        "style": {
            name: "",
            choices: ["mono", "cs16"],
            values: {
                mono: {
                    "--srclink": "https://owickstrom.github.io/the-monospace-web/",
                    "--srctext": "Design implemented from The Monospace Web",
                    "--srcopacity": "0.5",
                    "--line-height": "1.2rem",
                },
                cs16: {
                    "--srclink": "https://cs16.samke.me/",
                    "--srctext": "Design implemented from cs16.css",
                    "--srcopacity": "1",
                    "--line-height": "1.5rem",
                    "--background-color": "#4a5942",
                    "--background-color-alt": "#3e4637",
                    "--text-color": "#dedfd6",
                    "--text-color-alt": "#d8ded3",
                },
            },
            default: "mono"
        }
    }
} satisfies Settings;