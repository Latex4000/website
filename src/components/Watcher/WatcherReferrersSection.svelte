<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type {
        PaginatedResult,
        WatcherApiResponse,
    } from "../../server/watcher";

    type ReferrerRow =
        WatcherApiResponse["results"]["topReferrers"]["rows"][number];

    interface PageInfo {
        pageIndex: number;
        pageCount: number;
        total: number;
        limit: number;
    }

    const props = $props<{
        data?: PaginatedResult<ReferrerRow> | null;
        info: PageInfo;
        loading?: boolean;
        includeInternalReferrers?: boolean;
    }>();

    const numberFormatter = new Intl.NumberFormat();
    const dispatch = createEventDispatcher<{
        changePage: number;
        toggleInternal: boolean;
    }>();

    function goTo(nextIndex: number) {
        dispatch("changePage", nextIndex);
    }

    function handleToggle(event: Event & { currentTarget: HTMLInputElement }) {
        dispatch("toggleInternal", event.currentTarget.checked);
    }
</script>

<section
    aria-labelledby="watcher-referrers-heading"
    aria-busy={props.loading ? "true" : "false"}
>
    <h2 id="watcher-referrers-heading">Top referrers</h2>
    <label class="checkbox">
        <input
            type="checkbox"
            checked={props.includeInternalReferrers ?? false}
            onchange={handleToggle}
            disabled={props.loading}
        />
        <span>Include internal referrers</span>
    </label>
    {#if props.data && props.data.rows.length}
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th scope="col">Referrer</th>
                        <th scope="col">Views</th>
                    </tr>
                </thead>
                <tbody>
                    {#each props.data.rows as row}
                        <tr>
                            <td>{row.referrer || "Direct"}</td>
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
        <p>Loading referrer data…</p>
    {:else}
        <p>No referrer information for this range.</p>
    {/if}
</section>
