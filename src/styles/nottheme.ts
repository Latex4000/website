import type { Settings } from "nottheme";
import mono from "./themes/mono";
import cs16 from "./themes/cs16";
import latex from "./themes/latex";

export default {
    options: {
        "themes": {
            name: "",
            choices: [...mono.names, ...cs16.names, ...latex.names],
            values: {
                ...mono.values,
                ...cs16.values,
                ...latex.values,
            },
            default: [
                { query: "(prefers-color-scheme: dark)", choice: mono.names[1]! },
                mono.names[0]!,
            ]
        },
    }
} satisfies Settings;