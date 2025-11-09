<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type {
        PaginatedResult,
        WatcherApiResponse,
    } from "../../server/watcher";

    type StatusRow =
        WatcherApiResponse["results"]["statusBreakdown"]["rows"][number];

    interface PageInfo {
        pageIndex: number;
        pageCount: number;
        total: number;
        limit: number;
    }

    const props = $props<{
        data?: PaginatedResult<StatusRow> | null;
        info: PageInfo;
        loading?: boolean;
    }>();

    const numberFormatter = new Intl.NumberFormat();
    const dispatch = createEventDispatcher<{ changePage: number }>();

    function goTo(nextIndex: number) {
        dispatch("changePage", nextIndex);
    }
</script>

<section
    aria-labelledby="watcher-status-heading"
    aria-busy={props.loading ? "true" : "false"}
>
    <h2 id="watcher-status-heading">Status codes</h2>
    {#if props.data && props.data.rows.length}
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th scope="col">Status</th>
                        <th scope="col">Hits</th>
                    </tr>
                </thead>
                <tbody>
                    {#each props.data.rows as row}
                        <tr>
                            <td>{row.status}</td>
                            <td>{numberFormatter.format(row.views)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        {#if props.info.pageCount > 1}
            <div class="pagination">
                <button
                    type="button"
                    onclick={() => goTo(props.info.pageIndex - 1)}
                    disabled={props.loading || props.info.pageIndex === 0}
                >
                    Previous
                </button>
                <span
                    >Page {props.info.pageIndex + 1} of {props.info
                        .pageCount}</span
                >
                <button
                    type="button"
                    onclick={() => goTo(props.info.pageIndex + 1)}
                    disabled={props.loading ||
                        props.info.pageIndex + 1 >= props.info.pageCount}
                >
                    Next
                </button>
            </div>
        {/if}
    {:else if props.loading}
        <p>Loading status breakdown…</p>
    {:else}
        <p>No status data for this range.</p>
    {/if}
</section>
