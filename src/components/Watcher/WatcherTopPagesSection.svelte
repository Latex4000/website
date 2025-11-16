<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type {
        PaginatedResult,
        WatcherApiResponse,
    } from "../../server/watcher";

    type TopPagesRow =
        WatcherApiResponse["results"]["topPages"]["rows"][number];

    interface PageInfo {
        pageIndex: number;
        pageCount: number;
        total: number;
        limit: number;
    }

    const props = $props<{
        data?: PaginatedResult<TopPagesRow> | null;
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
    aria-labelledby="watcher-top-pages-heading"
    aria-busy={props.loading ? "true" : "false"}
    aria-live="polite"
>
    <h2 id="watcher-top-pages-heading">Top pages</h2>
    {#if props.data && props.data.rows.length}
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th scope="col">Path</th>
                        <th scope="col">Hits</th>
                    </tr>
                </thead>
                <tbody>
                    {#each props.data.rows as row}
                        <tr>
                            <td>{row.path}</td>
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
        <p role="status">Loading top pages…</p>
    {:else}
        <p role="status">No page view data found.</p>
    {/if}
</section>
