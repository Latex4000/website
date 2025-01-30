import type { Settings } from "nottheme";

export default {
    options: {
        "themes": {
            name: "",
            choices: ["mono-light", "mono-dark", "cs16"],
            values: {
                "mono-light": {
                    "--line-height": "1.2rem",
                    "--border-thickness": "2px",
                    "--text-color": "#000",
                    "--text-color-alt": "#666",
                    "--background-color": "#fff",
                    "--background-color-alt": "#eee",
                    "--srclink": "https://owickstrom.github.io/the-monospace-web/",
                    "--srctext": "Design implemented from The Monospace Web",
                    "--srcopacity": "0.5",
                },
                "mono-dark": {
                    "--line-height": "1.2rem",
                    "--border-thickness": "2px",
                    "--text-color": "#fff",
                    "--text-color-alt": "#ccc",
                    "--background-color": "#000",
                    "--background-color-alt": "#111",
                    "--srclink": "https://owickstrom.github.io/the-monospace-web/",
                    "--srctext": "Design implemented from The Monospace Web",
                    "--srcopacity": "0.5",
                },
                "cs16": {
                    "--line-height": "1rem",
                    "--border-thickness": "1px",
                    "--background-color": "#4a5942",
                    "--background-color-alt": "#3e4637",
                    "--text-color": "#dedfd6",
                    "--text-color-alt": "#d8ded3",
                    "--srclink": "https://cs16.samke.me/",
                    "--srctext": "Design implemented from cs16.css with font altered to Unifont",
                    "--srcopacity": "1",
                },
            },
            default: [
                { query: "(prefers-color-scheme: dark)", choice: "mono-dark" },
                "mono-light",
            ]
        },
    }
} satisfies Settings;