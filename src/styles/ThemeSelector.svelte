<script lang="ts">
    import { applyTheme } from "./themeClient";
    import { defaultTheme, themes } from "./config";

    let themeSlug = $state(
        import.meta.env.SSR ? defaultTheme.slug : document.body.dataset.theme!,
    );

    $effect(() => applyTheme(themeSlug));
</script>

<select
    bind:value={themeSlug}
    onchange={() => window.localStorage.setItem("theme-slug", themeSlug)}
    aria-label="Select Theme"
>
    {#each themes as theme}
        <option value={theme.slug}>
            {theme.name}
        </option>
    {/each}
</select>

<style>
    @media not (scripting) {
        select {
            display: none;
        }
    }
</style>
