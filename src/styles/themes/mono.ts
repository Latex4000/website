import createThemes from "../createThemes";
import cssUrl from "./mono.css?url";
import cssOverridesUrl from "./mono-overrides.css?url";
import cssResetUrl from "./mono-reset.css?url";

export default createThemes(
    ["mono", "mono-dark"],
    ["Mono", "Mono dark"],
    [cssResetUrl, cssUrl, cssOverridesUrl],
    {
        "--line-height": "1.2rem",
        "--border-thickness": "2px",
        "--background-color": ["#fff", "#000"],
        "--background-color-alt": ["#eee", "#111"],
        "--text-color": ["#000", "#fff"],
        "--text-color-alt": ["#666", "#aaa"],
        "--srclink": "https://owickstrom.github.io/the-monospace-web/",
        "--srctext": "Design implemented from The Monospace Web",
    },
);
