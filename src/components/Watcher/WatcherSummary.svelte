<script lang="ts">
    import type { TotalsResult } from "../../server/watcher";

    const {
        totals,
        loading,
    }: {
        totals?: TotalsResult | null;
        loading?: boolean;
    } = $props<{
        totals?: TotalsResult | null;
        loading?: boolean;
    }>();

    const numberFormatter = new Intl.NumberFormat();

    const comparisonLabels: Record<string, string> = {
        last24Hours: "Last 24 hours",
        last7Days: "Last 7 days",
        last30Days: "Last 30 days",
    };
</script>

<section
    aria-labelledby="watcher-summary-heading"
    aria-busy={loading ? "true" : "false"}
>
    <h2 id="watcher-summary-heading">Page view summary</h2>
    {#if totals}
        <div class="summary-grid">
            <div class="card">
                <h3>All time</h3>
                <p>{numberFormatter.format(totals.overall)} views</p>
            </div>
            <div class="card">
                <h3>Current range</h3>
                <p>{numberFormatter.format(totals.filtered)} views</p>
            </div>
            <div class="card">
                <h3>Comparisons</h3>
                <ul>
                    {#if Object.keys(totals.comparisons).length === 0}
                        <li>No saved comparisons yet.</li>
                    {:else}
                        {#each Object.entries(totals.comparisons) as [key, value]}
                            <li>
                                <span>{comparisonLabels[key] ?? key}</span>
                                <span>{numberFormatter.format(value)}</span>
                            </li>
                        {/each}
                    {/if}
                </ul>
            </div>
        </div>
    {:else if loading}
        <p>Loading summary…</p>
    {:else}
        <p>No page view data for the selected filters.</p>
    {/if}
</section>
