import eslintPluginAstro from "eslint-plugin-astro";
import pluginJs from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
    // add more generic rule sets here, such as:
    // js.configs.recommended,
    {
        ignores: ["dist/", ".astro/"],
    },
    pluginJs.configs.recommended,
    ...eslintPluginAstro.configs.recommended,
    ...eslintPluginAstro.configs["jsx-a11y-strict"],
    eslintConfigPrettier,
];
