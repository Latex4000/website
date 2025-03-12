import createThemes from "../createThemes";
import cssUrl from "./cs16.css?url";
import cssOverridesUrl from "./cs16-overrides.css?url";

export default createThemes(
    ["cs16"],
    ["CS 1.6"],
    [cssUrl, cssOverridesUrl],
    {
        "--line-height": "1rem",
        "--border-thickness": "1px",
        "--background-color": "#4a5942",
        "--background-color-alt": "#3e4637",
        "--text-color": "#dedfd6",
        "--text-color-alt": "#d8ded3",
        "--srclink": "https://cs16.samke.me/",
        "--srctext": "Design implemented from cs16.css with font altered to Unifont",
        "--srcopacity": 1,
    },
);
