import css from "@eslint/css";
import eslintPluginAstro from "eslint-plugin-astro";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    // add more generic rule sets here, such as:
    // js.configs.recommended,
    {
        ignores: [".astro/", "db/migrate.mjs", "db/cron.mjs", "dist/"],
    },
    {
        files: ["**/*.css"],
        language: "css/css",
        ...css.configs.recommended,
    },
    // This the stupidest shit ever need this ignore in order to have css not be affected by the linters underneath
    {
        ignores: ["**/*.css"],
    },
    pluginJs.configs.recommended,
    ...eslintPluginAstro.configs.recommended,
    ...eslintPluginAstro.configs["jsx-a11y-strict"],
    eslintConfigPrettier,
];
