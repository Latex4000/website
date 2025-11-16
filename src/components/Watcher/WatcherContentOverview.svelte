<script lang="ts">
    import type { ContentCounts } from "../../server/watcher";

    const props = $props<{
        contentCounts?: ContentCounts | null;
        loading?: boolean;
    }>();

    const numberFormatter = new Intl.NumberFormat();

    const contentStatus = $derived(() => {
        if (props.loading) {
            return "Loading content counts…";
        }
        if (props.contentCounts) {
            const totalEntries =
                props.contentCounts.members +
                props.contentCounts.actions +
                props.contentCounts.sounds +
                props.contentCounts.motions +
                props.contentCounts.sights +
                props.contentCounts.words;
            return `Showing totals for ${numberFormatter.format(totalEntries)} published items across all catalogs.`;
        }
        return "No published content found.";
    });
</script>

<section
    aria-labelledby="watcher-content-heading"
    aria-busy={props.loading ? "true" : "false"}
    aria-live="polite"
>
    <h2 id="watcher-content-heading">Content overview</h2>
    <p class="content-status" role="status">{contentStatus}</p>
    {#if props.contentCounts}
        <div class="content-grid">
            <div class="content-card">
                <h3>Members</h3>
                <p>{numberFormatter.format(props.contentCounts.members)}</p>
            </div>
            <div class="content-card">
                <h3>Actions</h3>
                <p>{numberFormatter.format(props.contentCounts.actions)}</p>
            </div>
            <div class="content-card">
                <h3>Sounds</h3>
                <p>{numberFormatter.format(props.contentCounts.sounds)}</p>
            </div>
            <div class="content-card">
                <h3>Motions</h3>
                <p>{numberFormatter.format(props.contentCounts.motions)}</p>
            </div>
            <div class="content-card">
                <h3>Sights</h3>
                <p>{numberFormatter.format(props.contentCounts.sights)}</p>
            </div>
            <div class="content-card">
                <h3>Words</h3>
                <p>{numberFormatter.format(props.contentCounts.words)}</p>
            </div>
        </div>
    {:else if props.loading}
        <p role="status">Loading content counts…</p>
    {:else}
        <p role="status">No published content found.</p>
    {/if}
</section>
