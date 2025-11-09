<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type {
        PaginatedResult,
        WatcherApiResponse,
    } from "../../server/watcher";

    type LatestPageViewRow =
        WatcherApiResponse["results"]["latestPageViews"]["rows"][number];

    interface PageInfo {
        pageIndex: number;
        pageCount: number;
        total: number;
        limit: number;
    }

    const props = $props<{
        data?: PaginatedResult<LatestPageViewRow> | null;
        info: PageInfo;
        loading?: boolean;
    }>();

    const dispatch = createEventDispatcher<{ changePage: number }>();

    function goTo(nextIndex: number) {
        dispatch("changePage", nextIndex);
    }
</script>

<section
    aria-labelledby="watcher-latest-heading"
    aria-busy={props.loading ? "true" : "false"}
>
    <h2 id="watcher-latest-heading">Latest page views</h2>
    {#if props.data && props.data.rows.length}
        <div class="table-wrapper">
            <table class="wide">
                <thead>
                    <tr>
                        <th scope="col">Time</th>
                        <th scope="col">Path</th>
                        <th scope="col">Status</th>
                        <th scope="col">Referrer</th>
                    </tr>
                </thead>
                <tbody>
                    {#each props.data.rows as row}
                        <tr>
                            <td>{new Date(row.createdAt).toLocaleString()}</td>
                            <td>{row.path}</td>
                            <td>{row.status}</td>
                            <td>{row.referrer ?? ""}</td>
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
        <p>Loading recent page views…</p>
    {:else}
        <p>No recent page views found.</p>
    {/if}
</section>
