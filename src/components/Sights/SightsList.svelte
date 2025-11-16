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
    const getOverlayTitleId = (id: number) => `sight-overlay-title-${id}`;
    const getOverlayDescriptionId = (id: number) =>
        `sight-overlay-description-${id}`;

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
        aria-pressed={thumbsMode === "low"}
        aria-label="Heh... upload sight.... if u dare"
    >
        {thumbsMode === "high" ? "Upload Sight" : "YOU ARE EVIL"}
    </button>
</div>

<br />

{#if sights.length > 0}
    <div class="sights-grid">
        {#each sights as sight}
            <div
                data-sight-id={sight.id}
                class="sight"
                tabindex="0"
                role="button"
                aria-pressed={selectedSight?.id === sight.id}
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
                        {#each thumbFilenamesById[sight.id]
                            ?.slice(0, 3)
                            .reverse() ?? [] as filename}
                            {@const thumbsDir =
                                quality === "high" ? "thumbs" : "thumbs-evil"}
                            <img
                                alt={`${sight.title} thumbnail`}
                                class={sight.pixelated ? "pixelated" : ""}
                                src="/sights-uploads/{sight.id}/{thumbsDir}/{filename}"
                                loading="lazy"
                                decoding="async"
                                title={sight.description}
                            />
                        {/each}
                    </div>
                {/each}
                <h3>
                    {sight.title}
                    {thumbsMode === "high" ? "(Original)" : "(Remix)"}
                </h3>
                <time
                    class="sight__date"
                    style="color: {sight.memberColor}"
                    datetime={sight.date.toISOString()}
                    data-format="localized"
                >
                    {sight.date.toUTCString()}
                </time>
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
            aria-label="Show previous sight"
            onclick={() => sightsNav(-1)}
            onkeydown={(event) => event.key === "Enter" && sightsNav(-1)}
        >
            ←
        </div>
        <div
            class="overlay-content"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby={getOverlayTitleId(selectedSight.id)}
            aria-describedby={getOverlayDescriptionId(selectedSight.id)}
            aria-live="assertive"
        >
            <button class="overlay-close" onclick={closeOverlay}>Close</button>
            <div class="overlay-header">
                <h3
                    id={getOverlayTitleId(selectedSight.id)}
                    style="color: {selectedSight.memberColor}"
                >
                    {selectedSight.title}
                </h3>
                <p
                    id={getOverlayDescriptionId(selectedSight.id)}
                    style="color: {selectedSight.memberColor}"
                >
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
                <time
                    class="overlay-date"
                    style="color: {selectedSight.memberColor}"
                    datetime={selectedSight.date.toISOString()}
                    data-format="localized"
                >
                    {selectedSight.date.toUTCString()}
                </time>
            </div>
            <div
                class="overlay-images"
                aria-live="polite"
                aria-busy={isLoading ? "true" : "false"}
                role="region"
            >
                {#if isLoading}
                    <p role="status" aria-live="assertive">Loading...</p>
                {/if}
                {#each selectedSight.fullFilenames as filename}
                    {@const imageUrl = `/sights-uploads/${selectedSight.id}/original/${filename}`}
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <img
                        alt={`${selectedSight.title} artwork`}
                        class={`${selectedSight.pixelated ? "pixelated" : ""} ${isLoading ? "loading-image" : ""} ${
                            loadedImages[filename] ? "loaded" : ""
                        } clickable-image`}
                        src={imageUrl}
                        loading="lazy"
                        decoding="async"
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
            </div>
        </div>
        <div
            class="overlay-nav overlay-right"
            tabindex="0"
            role="button"
            aria-pressed="false"
            aria-label="Show next sight"
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
        gap: var(--space-lg) var(--space-inline-md);
        margin-top: var(--sights-grid-margin-block-start, 0);
    }
    @media (min-width: 600px) {
        .sights-grid {
            grid-template-columns: 1fr 1fr;
        }
    }
    .sight {
        cursor: pointer;
        scroll-margin-top: var(--space-lg, 2lh);
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
        width: calc(100% - var(--space-inline-md) * (min(var(--count), 3) - 1));
    }
    .sight__images img:nth-child(1) {
        top: 0;
        left: 0;
    }
    .sight__images img:nth-child(2) {
        top: calc(var(--space-inline-md) * 3 / 4);
        left: var(--space-inline-md);
    }
    .sight__images img:nth-child(3) {
        top: calc(var(--space-inline-md) * 3 / 2);
        left: calc(var(--space-inline-md) * 2);
    }
    .sight h3 {
        margin: var(--space-sm) 0 0 0;
        text-align: center;
    }
    .sight__date {
        display: block;
        color: var(--text-color-alt);
        text-align: center;
    }
    .pixelated {
        image-rendering: pixelated;
    }
    .loading-image {
        filter: blur(5px);
        transition: filter 0.3s ease-in-out;
    }
    .loading-image.loaded {
        filter: blur(0);
    }
    .clickable-image {
        cursor: pointer;
    }
    /* Overlay Styles */
    .overlay {
        position: fixed;
        inset: 0;
        background-color: var(--surface-overlay-strong, rgba(0, 0, 0, 0.35));
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-color, inherit);
    }
    .overlay-content {
        background: var(--background-color);
        padding: var(--space-static-md);
        max-height: 100%;
        overflow: auto;
        scrollbar-width: none;
    }
    .overlay-nav {
        font-size: 10vw;
        margin: auto;
        padding: var(--space-static-md);
        cursor: pointer;
        color: inherit;
    }
    .overlay-header {
        top: calc(var(--space-static-md) * 3);
        width: fit-content;
        padding: var(--space-static-md);
        margin-bottom: var(--space-static-md);
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
        gap: var(--space-inline-md);
        overflow-x: auto;
        margin: var(--space-static-md) 0;
    }
    .overlay-tags > span {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(var(--space-xs) - var(--border-thickness))
            calc(var(--space-inline-md) - var(--border-thickness));
        white-space: nowrap;
    }
    .overlay-images {
        height: max-content;
    }
</style>
