import createThemes from "../createThemes";
import cssUrl from "./latex.css?url";
import cssOverridesUrl from "./latex-overrides.css?url";

export default createThemes(
    ["latex", "latex-dark"],
    ["LaTeX", "LaTeX dark"],
    [cssUrl, cssOverridesUrl],
    {
        "--line-height": "1rem",
        "--border-thickness": "1.36px",
        "--background-color": ["hsl(210, 20%, 98%)", "hsl(0, 6.80%, 14.30%)"],
        "--background-color-alt": ["hsl(210, 20%, 98%)", "hsl(0, 0%, 16%)"],
        "--text-color": ["hsl(0, 5%, 10%)", "hsl(0, 0%, 86%)"],
        "--text-color-alt": ["hsl(0, 5%, 10%)", "hsl(0, 0%, 86%)"],
        "--srclink": "https://latex.vercel.app/",
        "--srctext": "Design implemented from LaTeX.css",

        "--link-visited": ["hsl(0, 100%, 33%)", "hsl(196, 80%, 77%)"],
        "--link-focus-outline": ["hsl(220, 90%, 52%)", "hsl(215, 63%, 73%)"],
        "--pre-bg-color": ["hsl(210, 28%, 93%)", "hsl(0, 1%, 25%)"],
        "--kbd-bg-color": ["hsl(210, 5%, 100%)", "hsl(0, 0%, 16%)"],
        "--kbd-border-color": ["hsl(210, 5%, 70%)", "hsl(210, 5%, 70%)"],
        "--table-border-color": ["black", "white"],
        "--sidenote-target-border-color": ["hsl(55, 55%, 70%)", "hsl(0, 0%, 59%)"],
        "--footnotes-border-color": ["hsl(0, 0%, 39%)", "hsl(0, 0%, 59%)"],
        "--proof-symbol-filter": [null, "invert(80%)"],
    },
);
