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
        "--background-color": ["#eee", "#111"],
        "--background-color-alt": ["#ddd", "#222"],
        "--text-color": ["#111", "#eee"],
        "--text-color-alt": ["#222", "#ddd"],
        "--srclink": "https://owickstrom.github.io/the-monospace-web/",
        "--srctext": "Design implemented from The Monospace Web",
    },
);
