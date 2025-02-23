<script lang="ts">
    import { onMount } from "svelte";

    interface Sight {
        memberColor: string;
        id: number;
        title: string;
        description: string;
        memberDiscord: string;
        date: Date;
        tags: string[];
        deleted: boolean;
        showColour: boolean;
        pixelated: boolean;
    }

    interface SelectedSight extends Sight {
        fullFilenames: string[];
    }

    // Props passed from Astro
    export let sights: Array<Sight>;
    export let thumbFilenamesById: Record<number, string[]>;
    export let fullFilenamesById: Record<number, string[]>;

    // State
    let selectedSight: SelectedSight | undefined = undefined;

    function selectSight(sight: Sight) {
        const fullFilenames = fullFilenamesById[sight.id] || [];
        selectedSight = { ...sight, fullFilenames };
    }

    function closeOverlay() {
        selectedSight = undefined;
    }

    const handleKeydown = (event: KeyboardEvent, sight?: Sight) => {
        if (event.key === "Escape") closeOverlay();
        if (event.key === "Enter" && sight) selectSight(sight);
    };

    onMount(() => {
        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    });
</script>

<div class="sights-grid">
    {#if sights.length > 0}
        {#each sights as sight}
            <div
                class="sight"
                tabindex="0"
                role="button"
                aria-pressed="false"
                onclick={() => selectSight(sight)}
                onkeydown={(e) => handleKeydown(e, sight)}
            >
                <div
                    class="sight__images sight__images--{Math.min(
                        3,
                        thumbFilenamesById[sight.id]?.length ?? 0,
                    )} sight__images--quality-high"
                >
                    {#each thumbFilenamesById[sight.id]?.slice(0, 3) ?? [] as filename}
                        <img
                            alt=""
                            class={sight.pixelated ? "pixelated" : ""}
                            src={`/sights-uploads/${sight.id}/thumbs/${filename}`}
                            title={sight.description}
                        />
                    {/each}
                </div>
                <div
                    class="sight__images sight__images--{Math.min(
                        3,
                        thumbFilenamesById[sight.id]?.length ?? 0,
                    )} sight__images--quality-low"
                >
                    {#each thumbFilenamesById[sight.id]?.slice(0, 3) ?? [] as filename}
                        <img
                            alt=""
                            class={sight.pixelated ? "pixelated" : ""}
                            src={`/sights-uploads/${sight.id}/thumbs-evil/${filename}`}
                            title={sight.description}
                        />
                    {/each}
                </div>
                <h3>{sight.title}</h3>
                <div
                    class="sight__date"
                    style="color: {sight.showColour
                        ? sight.memberColor
                        : undefined}"
                >
                    {new Date(sight.date).toLocaleString()}
                </div>
            </div>
        {/each}
    {:else}
        <p>No sights currently</p>
    {/if}
</div>

<!-- Overlay (only shown when a sight is selected) -->
{#if selectedSight}
    <div
        id="overlay"
        class="overlay"
        tabindex="0"
        role="button"
        aria-pressed="false"
        onclick={closeOverlay}
        onkeydown={handleKeydown}
    >
        <div
            class="overlay-content"
            tabindex="0"
            role="button"
            aria-pressed="false"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
        >
            <button id="overlay-close" onclick={closeOverlay}>Close</button>
            <div class="overlay-header">
                <h3 style="color: {selectedSight.memberColor}">
                    {selectedSight.title}
                </h3>
                <p style="color: {selectedSight.memberColor}">
                    {selectedSight.description}
                </p>
                <div id="overlay-tags">
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
                    id="overlay-date"
                    style="color: {selectedSight.memberColor}"
                >
                    {new Date(selectedSight.date).toLocaleString()}
                </div>
            </div>
            <div class="overlay-images">
                {#each selectedSight.fullFilenames as filename}
                    <img
                        alt=""
                        class={selectedSight.pixelated ? "pixelated" : ""}
                        src={`/sights-uploads/${selectedSight.id}/original/${filename}`}
                    />
                {/each}
            </div>
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
        object-fit: cover;
        position: absolute;
        width: 100%;
    }
    .sight__images--1 img {
        object-fit: contain;
    }
    .sight__images--2 img {
        width: calc(100% - 2ch);
    }
    .sight__images--3 img {
        width: calc(100% - 4ch);
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
    /* Overlay Styles */
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    .overlay-content {
        background: var(--background-color);
        padding: 1rem;
        max-height: 90vh;
        max-width: 90vw;
        overflow-y: auto;
        position: relative;
    }
    .overlay-header {
        margin-bottom: 1rem;
    }
    #overlay-close {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
    }
    #overlay-tags {
        display: flex;
        gap: 2ch;
        overflow-x: auto;
        margin-top: auto;
    }
    #overlay-tags > span {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(0.5lh - var(--border-thickness))
            calc(2ch - var(--border-thickness));
        white-space: nowrap;
    }
    .overlay-images img {
        display: block;
        width: 100%;
        margin-bottom: 1rem;
    }
</style>
