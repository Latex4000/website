<script lang="ts">
    import type { InferSelectModel } from "drizzle-orm";
    import { onMount } from "svelte";
    import type { Sight as SightTable } from "../../database/schema";

    type Sight = Omit<InferSelectModel<typeof SightTable>, "showColour"> & {
        memberColor?: string;
    };

    const {
        sights,
        thumbFilenamesById,
        fullFilenamesById,
    }: {
        sights: Sight[];
        thumbFilenamesById: Record<number, string[]>;
        fullFilenamesById: Record<number, string[]>;
    } = $props();

    const THUMBS_MODE_KEY = "sights_thumbs";

    // This syntax can't be simplified because Svelte needs to understand that localStorage is never referenced during SSR... I think
    const initialThumbsMode =
        typeof localStorage === "undefined"
            ? "high"
            : (localStorage.getItem(THUMBS_MODE_KEY) ?? "high");

    let selectedSight = $state<Sight & { fullFilenames: string[] }>();
    let thumbsMode = $state(initialThumbsMode as "high" | "low");
    let isLoading = $state(false);
    let loadedImages = $state<Record<string, boolean>>({});

    function selectSight(sight: Sight) {
        isLoading = true;
        loadedImages = {};
        const fullFilenames = fullFilenamesById[sight.id] ?? [];
        selectedSight = { ...sight, fullFilenames };
    }

    function selectThumbsMode(mode: "high" | "low") {
        thumbsMode = mode;
        localStorage.setItem(THUMBS_MODE_KEY, mode);
    }

    function closeOverlay() {
        isLoading = false;
        loadedImages = {};
        selectedSight = undefined;
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") closeOverlay();
    }

    function sightsNav(direction: 1 | -1) {
        if (!selectedSight) return;

        isLoading = true;
        loadedImages = {};

        const index = sights.findIndex(
            (sight) => sight.id === selectedSight!.id,
        );
        const newIndex = (index + direction + sights.length) % sights.length;
        selectSight(sights[newIndex]!);
    }

    function openImageInNewTab(imageUrl: string) {
        window.open(imageUrl, "_blank");
    }

    function handleImageLoad(filename: string) {
        loadedImages[filename] = true;
        if (
            selectedSight &&
            selectedSight.fullFilenames.every((f) => loadedImages[f])
        )
            isLoading = false;
    }

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);

        return () => window.removeEventListener("keydown", handleKeydown);
    });
</script>

<div>
    <button
        class="thumbs-mode"
        style="--thumbs-mode: {thumbsMode}"
        onclick={() => selectThumbsMode(thumbsMode === "high" ? "low" : "high")}
    >
        {thumbsMode === "high" ? "Upload Sight" : "YOU ARE EVIL"}
    </button>
</div>

<br />

{#if sights.length > 0}
    <div class="sights-grid">
        {#each sights as sight}
            <div
                class="sight"
                tabindex="0"
                role="button"
                aria-pressed="false"
                onclick={() => selectSight(sight)}
                onkeydown={(event) =>
                    event.key === "Enter" && selectSight(sight)}
            >
                {#each ["high", "low"] as const as quality}
                    <div
                        class="sight__images"
                        style="--count: {thumbFilenamesById[sight.id]?.length ??
                            0}; display: {quality === thumbsMode
                            ? 'block'
                            : 'none'}"
                    >
                        {#each thumbFilenamesById[sight.id]?.slice(0, 3) ?? [] as filename}
                            {@const thumbsDir =
                                quality === "high" ? "thumbs" : "thumbs-evil"}
                            <img
                                alt=""
                                class={sight.pixelated ? "pixelated" : ""}
                                src="/sights-uploads/{sight.id}/{thumbsDir}/{filename}"
                                title={sight.description}
                            />
                        {/each}
                    </div>
                {/each}
                <h3>
                    {sight.title}
                    {thumbsMode === "high" ? "(Original)" : "(Remix)"}
                </h3>
                <div class="sight__date" style="color: {sight.memberColor}">
                    {new Date(sight.date).toLocaleString()}
                </div>
            </div>
        {/each}
    </div>
{:else}
    <p>No sights currently</p>
{/if}

<!-- Overlay (only shown when a sight is selected) -->
{#if selectedSight}
    <div class="overlay">
        <div
            class="overlay-nav overlay-left"
            tabindex="0"
            role="button"
            aria-pressed="false"
            onclick={() => sightsNav(-1)}
            onkeydown={(event) => event.key === "Enter" && sightsNav(-1)}
        >
            ←
        </div>
        <div class="overlay-content" tabindex="-1">
            <button class="overlay-close" onclick={closeOverlay}>Close</button>
            <div class="overlay-header">
                <h3 style="color: {selectedSight.memberColor}">
                    {selectedSight.title}
                </h3>
                <p style="color: {selectedSight.memberColor}">
                    {selectedSight.description}
                </p>
                <div class="overlay-tags">
                    {#if selectedSight.tags}
                        {#each selectedSight.tags as tag}
                            <span
                                class={tag}
                                style="color: {selectedSight.memberColor}"
                            >
                                {tag}
                            </span>
                        {/each}
                    {/if}
                </div>
                <div
                    class="overlay-date"
                    style="color: {selectedSight.memberColor}"
                >
                    {new Date(selectedSight.date).toLocaleString()}
                </div>
            </div>
            <div class="overlay-images">
                {#if isLoading}
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>Loading...</p>
                    </div>
                {:else}
                    {#each selectedSight.fullFilenames as filename}
                        {@const imageUrl = `/sights-uploads/${selectedSight.id}/original/${filename}`}
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <img
                            alt=""
                            class={`${selectedSight.pixelated ? "pixelated" : ""} clickable-image`}
                            src={imageUrl}
                            onclick={(e) => {
                                e.stopPropagation();
                                openImageInNewTab(imageUrl);
                            }}
                            onkeydown={(e) => {
                                if (e.key === "Enter") {
                                    e.stopPropagation();
                                    openImageInNewTab(imageUrl);
                                }
                            }}
                            onload={() => handleImageLoad(filename)}
                            title="Click to open in new tab"
                        />
                    {/each}
                {/if}
            </div>
        </div>
        <div
            class="overlay-nav overlay-right"
            tabindex="0"
            role="button"
            aria-pressed="false"
            onclick={() => sightsNav(1)}
            onkeydown={(event) => event.key === "Enter" && sightsNav(1)}
        >
            →
        </div>
    </div>
{/if}

<style>
    .sights-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2lh 2ch;
    }
    @media (min-width: 600px) {
        .sights-grid {
            grid-template-columns: 1fr 1fr;
        }
    }
    .sight {
        cursor: pointer;
    }
    .sight__images {
        aspect-ratio: 4 / 3;
        position: relative;
    }
    .sight__images img {
        aspect-ratio: 4 / 3;
        display: block;
        object-fit: contain;
        position: absolute;
        width: calc(100% - 2ch * (min(var(--count), 3) - 1));
    }
    .sight__images img:nth-child(1) {
        top: 0;
        left: 0;
    }
    .sight__images img:nth-child(2) {
        top: calc(2ch * 3 / 4);
        left: 2ch;
    }
    .sight__images img:nth-child(3) {
        top: calc(4ch * 3 / 4);
        left: 4ch;
    }
    .sight h3 {
        margin: 1lh 0 0 0;
        text-align: center;
    }
    .sight__date {
        color: var(--text-color-alt);
        text-align: center;
    }
    .pixelated {
        image-rendering: pixelated;
    }
    .clickable-image {
        cursor: pointer;
    }
    /* Overlay Styles */
    .overlay {
        position: fixed;
        inset: 0;
        background-color: #222c;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .overlay-content {
        background: var(--background-color);
        padding: 1rem;
        max-height: 100%;
        overflow: auto;
        scrollbar-width: none;
    }
    .overlay-nav {
        font-size: 10vw;
        margin: auto;
        padding: 1rem;
        cursor: pointer;
    }
    .overlay-header {
        top: 3rem;
        width: fit-content;
        padding: 1rem;
        margin-bottom: 1rem;
        background: var(--background-color);
    }
    .overlay-header h3 {
        margin-top: 0;
    }
    .overlay-close {
        top: 0;
    }
    .overlay-header,
    .overlay-close {
        position: sticky;
        left: 0;
    }
    .overlay-tags {
        display: flex;
        gap: 2ch;
        overflow-x: auto;
        margin: 1rem 0;
    }
    .overlay-tags > span {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(0.5lh - var(--border-thickness))
            calc(2ch - var(--border-thickness));
        white-space: nowrap;
    }
    .overlay-images {
        height: max-content;
    }
</style>
