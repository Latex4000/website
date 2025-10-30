<script lang="ts">
    import { applyTheme, defaultTheme, themes } from "./themeData";

    let themeSlug = $state(
        import.meta.env.SSR ? defaultTheme.slug : document.body.dataset.theme!,
    );

    $effect(() => {
        applyTheme(themeSlug);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("theme-slug", themeSlug);
        }
    });
</script>

<select bind:value={themeSlug}>
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
