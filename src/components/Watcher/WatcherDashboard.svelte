<script lang="ts">
    import { onMount } from "svelte";
    import type {
        ContentCounts,
        PaginatedResult,
        TotalsResult,
        ViewBucket,
        WatcherApiResponse,
    } from "../../server/watcher";
    import WatcherContentOverview from "./WatcherContentOverview.svelte";
    import WatcherSummary from "./WatcherSummary.svelte";
    import WatcherViewsChart from "./WatcherViewsChart.svelte";
    import WatcherTopPagesSection from "./WatcherTopPagesSection.svelte";
    import WatcherLatestPageViewsSection from "./WatcherLatestPageViewsSection.svelte";
    import WatcherReferrersSection from "./WatcherReferrersSection.svelte";
    import WatcherStatusSection from "./WatcherStatusSection.svelte";

    type TopPagesRow =
        WatcherApiResponse["results"]["topPages"]["rows"][number];
    type LatestPageViewRow =
        WatcherApiResponse["results"]["latestPageViews"]["rows"][number];
    type ReferrerRow =
        WatcherApiResponse["results"]["topReferrers"]["rows"][number];
    type StatusRow =
        WatcherApiResponse["results"]["statusBreakdown"]["rows"][number];

    type PresetId = "24h" | "7d" | "30d" | "90d" | "all";

    interface Preset {
        id: PresetId;
        label: string;
        durationMs: number | null;
    }

    interface TableState<T> {
        data: PaginatedResult<T> | null;
        limit: number;
        offset: number;
    }

    type TableStates = {
        topPages: TableState<TopPagesRow>;
        latest: TableState<LatestPageViewRow>;
        referrers: TableState<ReferrerRow>;
        status: TableState<StatusRow>;
    };

    const { data: initialData } = $props<{
        data?: WatcherApiResponse | null;
    }>();

    const presets: Preset[] = [
        { id: "24h", label: "Last 24 hours", durationMs: 24 * 60 * 60 * 1000 },
        { id: "7d", label: "Last 7 days", durationMs: 7 * 24 * 60 * 60 * 1000 },
        {
            id: "30d",
            label: "Last 30 days",
            durationMs: 30 * 24 * 60 * 60 * 1000,
        },
        {
            id: "90d",
            label: "Last 90 days",
            durationMs: 90 * 24 * 60 * 60 * 1000,
        },
        { id: "all", label: "All time", durationMs: null },
    ];

    const defaultPresetId: PresetId = "7d";
    const defaultPreset = presets.find(
        (preset) => preset.id === defaultPresetId,
    );
    const defaultRange = defaultPreset?.durationMs
        ? computeRange(defaultPreset.durationMs)
        : null;

    function computeRange(durationMs: number): { from: Date; to: Date } {
        const to = new Date();
        const from = new Date(to.getTime() - durationMs);
        return { from, to };
    }

    function dateToInputValue(date: Date): string {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, "0");
        const day = `${date.getDate()}`.padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function isoToDateInput(value: string | null | undefined): string {
        if (!value) return "";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "";
        return dateToInputValue(parsed);
    }

    function dateInputToIso(value: string, endOfDay = false): string | null {
        if (!value) return null;
        const [year, month, day] = value
            .split("-")
            .map((part) => Number.parseInt(part, 10));
        if (
            [year, month, day].some(
                (piece) =>
                    Number.isNaN(piece) || piece === undefined || piece <= 0,
            )
        )
            return null;
        const date = new Date(
            year!,
            month! - 1,
            day!,
            endOfDay ? 23 : 0,
            endOfDay ? 59 : 0,
            endOfDay ? 59 : 0,
            endOfDay ? 999 : 0,
        );
        return date.toISOString();
    }

    function parseStatusInput(value: string): number[] {
        const tokens = value
            .split(/[\s,]+/)
            .map((token) => token.trim())
            .filter(Boolean);
        const unique = new Set<number>();
        for (const token of tokens) {
            const parsed = Number.parseInt(token, 10);
            if (!Number.isNaN(parsed)) {
                unique.add(parsed);
            }
        }
        return Array.from(unique.values());
    }

    function inferPreset(
        fromIso: string | null | undefined,
        toIso: string | null | undefined,
        referenceIso: string,
    ): PresetId | null {
        if (!fromIso && !toIso) return "all";
        if (!fromIso) return null;

        const from = new Date(fromIso);
        if (Number.isNaN(from.getTime())) return null;

        const to = toIso ? new Date(toIso) : new Date(referenceIso);
        if (Number.isNaN(to.getTime())) return null;

        const delta = to.getTime() - from.getTime();
        for (const preset of presets) {
            if (!preset.durationMs) continue;
            const difference = Math.abs(delta - preset.durationMs);
            if (difference <= 60 * 60 * 1000) {
                return preset.id;
            }
        }
        return null;
    }

    function extractHost(value: string | null | undefined): string | null {
        if (!value?.trim()) return null;

        try {
            const url = new URL(
                value.startsWith("http") || value.startsWith("//")
                    ? value
                    : `https://${value}`,
            );
            return url.hostname.toLowerCase();
        } catch {
            return null;
        }
    }

    function registerHost(candidate: string | null | undefined): string[] {
        const host = extractHost(candidate);
        if (!host) return [];

        return host.startsWith("www.")
            ? [host, host.slice(4)]
            : [host, `www.${host}`];
    }

    interface BucketOption {
        id: ViewBucket;
        label: string;
        durationMs: number;
    }

    const bucketOptions: BucketOption[] = [
        {
            id: "hour",
            label: "Hour",
            durationMs: 60 * 60 * 1000,
        },
        {
            id: "day",
            label: "Day",
            durationMs: 24 * 60 * 60 * 1000,
        },
        {
            id: "week",
            label: "Week",
            durationMs: 7 * 24 * 60 * 60 * 1000,
        },
        {
            id: "month",
            label: "Month",
            durationMs: 4 * 7 * 24 * 60 * 60 * 1000,
        },
    ];

    const bucketConfig = bucketOptions.reduce(
        (accumulator, option) => {
            accumulator[option.id] = option;
            return accumulator;
        },
        {} as Record<ViewBucket, BucketOption>,
    );

    let internalHostList: string[] = $state([]);

    let selectedPreset = $state<PresetId | null>(defaultPresetId);
    let presetAnchored = $state(Boolean(defaultPreset?.durationMs));
    let fromInput = $state(
        defaultRange ? dateToInputValue(defaultRange.from) : "",
    );
    let toInput = $state(defaultRange ? dateToInputValue(defaultRange.to) : "");
    let pagePathInput = $state("");
    let referrerInput = $state("");
    let statusInput = $state("");
    let includeEmptyPath = $state(false);
    let includeInternalReferrers = $state(false);
    const initialBucket =
        (initialData?.filters.bucket as ViewBucket | undefined) ?? "day";
    let selectedBucket = $state<ViewBucket>(initialBucket);

    function computeRangeDurationMs(): number | null {
        const fromIso = fromInput ? dateInputToIso(fromInput) : null;
        const toIso = toInput ? dateInputToIso(toInput, true) : null;
        if (!fromIso) return null;

        const fromDate = new Date(fromIso);
        if (Number.isNaN(fromDate.getTime())) return null;

        const toDate = toIso ? new Date(toIso) : new Date();
        if (Number.isNaN(toDate.getTime())) return null;

        const diff = toDate.getTime() - fromDate.getTime();
        return diff > 0 ? diff : 0;
    }

    const availableBuckets = $derived.by(() => {
        const spanMs = computeRangeDurationMs();
        if (spanMs == null) return bucketOptions;

        const filtered = bucketOptions.filter(
            (option) => spanMs >= option.durationMs * 2,
        );

        return filtered.length ? filtered : [bucketOptions[0]!];
    });

    $effect(() => {
        if (availableBuckets.some((option) => option.id === selectedBucket))
            return;
        selectedBucket = availableBuckets[0]?.id ?? "day";
    });

    function ensureBucketSelection(): ViewBucket {
        const options = availableBuckets;
        if (options.some((option) => option.id === selectedBucket))
            return selectedBucket;
        const fallback = options[0]?.id ?? "day";
        selectedBucket = fallback;
        return fallback;
    }

    let tableStates = $state<TableStates>({
        topPages: { data: null, limit: 10, offset: 0 },
        latest: { data: null, limit: 20, offset: 0 },
        referrers: { data: null, limit: 10, offset: 0 },
        status: { data: null, limit: 10, offset: 0 },
    });

    let totals = $state<TotalsResult | null>(null);
    let contentCounts = $state<ContentCounts | null>(null);
    let dailyViews = $state<{ date: Date; views: number }[]>([]);

    let loading = $state(false);
    let error = $state<string | null>(null);
    let lastUpdated = $state<Date | null>(null);

    const topPagesInfo = $derived(getPageInfo(tableStates.topPages));
    const latestInfo = $derived(getPageInfo(tableStates.latest));
    const referrersInfo = $derived.by(() => {
        const data = tableStates.referrers.data;
        const limit = data?.limit ?? tableStates.referrers.limit;
        const offset = data?.offset ?? tableStates.referrers.offset;
        const total = data?.total ?? 0;
        const pageCount = limit ? Math.ceil(total / limit) : 0;
        const pageIndex = limit ? Math.floor(offset / limit) : 0;
        return { pageIndex, pageCount, total, limit };
    });
    const statusInfo = $derived(getPageInfo(tableStates.status));

    function getPageInfo<T>(state: TableState<T>) {
        const data = state.data;
        const limit = data?.limit ?? state.limit;
        const offset = data?.offset ?? state.offset;
        const total = data?.total ?? 0;
        const pageCount = limit ? Math.ceil(total / limit) : 0;
        const pageIndex = limit ? Math.floor(offset / limit) : 0;
        return { pageIndex, pageCount, total, limit };
    }

    function applyApiResponse(payload: WatcherApiResponse) {
        totals = payload.results.totals;
        contentCounts = payload.results.contentCounts;
        dailyViews = payload.results.dailyViews.map((point) => ({
            date: new Date(point.date),
            views: point.views,
        }));

        tableStates.topPages.data = payload.results.topPages;
        tableStates.topPages.limit = payload.results.topPages.limit;
        tableStates.topPages.offset = payload.results.topPages.offset;

        tableStates.latest.data = payload.results.latestPageViews;
        tableStates.latest.limit = payload.results.latestPageViews.limit;
        tableStates.latest.offset = payload.results.latestPageViews.offset;

        tableStates.referrers.data = payload.results.topReferrers;
        tableStates.referrers.limit = payload.results.topReferrers.limit;
        tableStates.referrers.offset = payload.results.topReferrers.offset;

        tableStates.status.data = payload.results.statusBreakdown;
        tableStates.status.limit = payload.results.statusBreakdown.limit;
        tableStates.status.offset = payload.results.statusBreakdown.offset;

        lastUpdated = new Date(payload.serverNow);

        fromInput = isoToDateInput(payload.filters.from);
        toInput = isoToDateInput(payload.filters.to);
        pagePathInput = payload.filters.pagePath ?? "";
        referrerInput = payload.filters.referrerQuery ?? "";
        statusInput = payload.filters.statusCodes?.length
            ? payload.filters.statusCodes.join(", ")
            : "";
        includeEmptyPath = payload.filters.includeEmptyPath ?? false;
        const responseBucket = payload.filters.bucket as ViewBucket | undefined;
        if (responseBucket && bucketConfig[responseBucket]) {
            selectedBucket = responseBucket;
        }
    }

    async function fetchAnalytics({
        resetPagination = false,
    }: { resetPagination?: boolean } = {}) {
        const bucketForRequest = ensureBucketSelection();
        if (resetPagination) {
            tableStates.topPages.offset = 0;
            tableStates.latest.offset = 0;
            tableStates.referrers.offset = 0;
            tableStates.status.offset = 0;
        }

        const statusCodes = parseStatusInput(statusInput);
        const params = new URLSearchParams();
        const activePreset = selectedPreset
            ? presets.find((candidate) => candidate.id === selectedPreset)
            : undefined;

        let fromIso = fromInput ? dateInputToIso(fromInput) : null;
        let toIso = toInput ? dateInputToIso(toInput, true) : null;

        if (presetAnchored && activePreset?.durationMs) {
            const { from, to } = computeRange(activePreset.durationMs);
            fromIso = from.toISOString();
            toIso = to.toISOString();
        } else if (
            presetAnchored &&
            activePreset &&
            activePreset.durationMs == null
        ) {
            fromIso = null;
            toIso = null;
        }

        if (fromIso) params.set("from", fromIso);
        if (toIso) params.set("to", toIso);
        if (pagePathInput.trim()) params.set("pagePath", pagePathInput.trim());
        if (referrerInput.trim())
            params.set("referrerQuery", referrerInput.trim());
        if (statusCodes.length) params.set("status", statusCodes.join(","));
        if (includeEmptyPath) params.set("includeEmptyPath", "true");
        if (includeInternalReferrers)
            params.set("includeInternalReferrers", "true");
        if (!includeInternalReferrers && internalHostList.length) {
            for (const host of internalHostList) {
                params.append("internalHost", host);
            }
        }

        params.set("topPagesLimit", `${tableStates.topPages.limit}`);
        params.set("topPagesOffset", `${tableStates.topPages.offset}`);
        params.set("latestLimit", `${tableStates.latest.limit}`);
        params.set("latestOffset", `${tableStates.latest.offset}`);
        params.set("referrersLimit", `${tableStates.referrers.limit}`);
        params.set("referrersOffset", `${tableStates.referrers.offset}`);
        params.set("statusLimit", `${tableStates.status.limit}`);
        params.set("statusOffset", `${tableStates.status.offset}`);
        params.set("timezoneOffset", `${new Date().getTimezoneOffset()}`);
        params.set("bucket", bucketForRequest);

        loading = true;
        error = null;
        try {
            const response = await fetch(`/api/watcher?${params.toString()}`, {
                headers: { Accept: "application/json" },
            });
            if (!response.ok)
                throw new Error(
                    `Request failed with status ${response.status}`,
                );
            const payload: WatcherApiResponse = await response.json();
            applyApiResponse(payload);
        } catch (fetchError) {
            console.error("Failed to fetch analytics data", fetchError);
            error =
                fetchError instanceof Error
                    ? fetchError.message
                    : "Unknown error";
        } finally {
            loading = false;
        }
    }

    function handlePresetClick(preset: Preset) {
        selectedPreset = preset.id;
        presetAnchored = Boolean(preset.durationMs);
        if (preset.durationMs) {
            const { from, to } = computeRange(preset.durationMs);
            fromInput = dateToInputValue(from);
            toInput = dateToInputValue(to);
        } else {
            fromInput = "";
            toInput = "";
        }
        fetchAnalytics({ resetPagination: true });
    }

    function inferPresetFromInputs(): PresetId | null {
        const fromIso = fromInput ? dateInputToIso(fromInput) : null;
        const toIso = toInput ? dateInputToIso(toInput, true) : null;
        return inferPreset(fromIso, toIso, new Date().toISOString());
    }

    function applyFilters() {
        selectedPreset = inferPresetFromInputs();
        presetAnchored = false;
        fetchAnalytics({ resetPagination: true });
    }

    function resetFilters() {
        const preset = presets.find(
            (candidate) => candidate.id === defaultPresetId,
        );
        selectedPreset = defaultPresetId;
        presetAnchored = Boolean(preset?.durationMs);
        pagePathInput = "";
        referrerInput = "";
        statusInput = "";
        includeEmptyPath = false;
        includeInternalReferrers = false;
        selectedBucket = initialBucket;
        if (preset?.durationMs) {
            const { from, to } = computeRange(preset.durationMs);
            fromInput = dateToInputValue(from);
            toInput = dateToInputValue(to);
        } else {
            fromInput = "";
            toInput = "";
        }
        fetchAnalytics({ resetPagination: true });
    }

    function goToPage(table: keyof TableStates, nextIndex: number) {
        const state = tableStates[table];
        const info = getPageInfo<any>(state);
        if (!info.pageCount) return;
        const clamped = Math.max(0, Math.min(nextIndex, info.pageCount - 1));
        if (clamped === info.pageIndex) return;
        state.offset = clamped * info.limit;
        fetchAnalytics();
    }

    function handleDateInputChange() {
        selectedPreset = inferPresetFromInputs();
        presetAnchored = false;
    }

    function handleBucketChange(next: ViewBucket) {
        if (next === selectedBucket) return;
        selectedBucket = next;
        fetchAnalytics();
    }

    function handleIncludeInternalToggle(next: boolean) {
        includeInternalReferrers = next;
        fetchAnalytics({ resetPagination: true });
    }

    onMount(() => {
        const internalHostSet = new Set([
            ...internalHostList,
            ...registerHost(import.meta.env.SITE),
            ...registerHost("localhost"),
            ...registerHost("127.0.0.1"),
            ...registerHost(window.location.origin),
            ...registerHost(window.location.hostname),
        ]);
        internalHostList = Array.from(internalHostSet);

        const clientOffset = new Date().getTimezoneOffset();

        if (!initialData) {
            fetchAnalytics({ resetPagination: false });
        } else {
            applyApiResponse(initialData);
            const payloadOffset = initialData.filters.timezoneOffsetMinutes;
            if (payloadOffset == null || payloadOffset !== clientOffset) {
                fetchAnalytics({ resetPagination: false });
            }
        }
    });
</script>

<div class="watcher-dashboard">
    <WatcherContentOverview {contentCounts} {loading} />
    <section class="filters" aria-labelledby="watcher-filters-heading">
        <div class="filters-header">
            <h2 id="watcher-filters-heading">Filters</h2>
            {#if lastUpdated}
                <p class="filters-updated">
                    Last updated {lastUpdated.toLocaleString()}
                </p>
            {/if}
        </div>
        <div class="preset-buttons" role="group" aria-label="Quick date ranges">
            {#each presets as preset}
                <button
                    type="button"
                    class:selected={selectedPreset === preset.id}
                    onclick={() => handlePresetClick(preset)}
                    aria-pressed={selectedPreset === preset.id}
                    disabled={loading}
                >
                    {preset.label}
                </button>
            {/each}
        </div>
        <div class="filter-grid">
            <label>
                <span>From</span>
                <input
                    type="date"
                    bind:value={fromInput}
                    onchange={handleDateInputChange}
                    disabled={loading}
                />
            </label>
            <label>
                <span>To</span>
                <input
                    type="date"
                    bind:value={toInput}
                    onchange={handleDateInputChange}
                    disabled={loading}
                />
            </label>
            <label>
                <span>Page path</span>
                <input
                    type="search"
                    bind:value={pagePathInput}
                    placeholder="/example"
                    onkeydown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            applyFilters();
                        }
                    }}
                    disabled={loading}
                />
            </label>
            <label>
                <span>Referrer</span>
                <input
                    type="search"
                    bind:value={referrerInput}
                    placeholder="example.com"
                    onkeydown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            applyFilters();
                        }
                    }}
                    disabled={loading}
                />
            </label>
            <label>
                <span>Status codes</span>
                <input
                    type="text"
                    bind:value={statusInput}
                    placeholder="200, 404"
                    onkeydown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            applyFilters();
                        }
                    }}
                    disabled={loading}
                />
            </label>
            <label class="checkbox">
                <input
                    type="checkbox"
                    bind:checked={includeEmptyPath}
                    disabled={loading}
                />
                <span>Include empty paths</span>
            </label>
        </div>
        <div class="filter-actions">
            <button type="button" onclick={applyFilters} disabled={loading}>
                Apply filters
            </button>
            <button type="button" onclick={resetFilters} disabled={loading}>
                Reset
            </button>
        </div>
        {#if loading}
            <p class="filters-loading" role="status" aria-live="polite">
                Loading analytics…
            </p>
        {/if}
    </section>

    {#if error}
        <section class="error" role="alert">
            <p>Unable to load data: {error}</p>
            <button
                type="button"
                onclick={() => fetchAnalytics()}
                disabled={loading}
            >
                Retry
            </button>
        </section>
    {/if}

    <WatcherSummary {totals} {loading} />

    <WatcherViewsChart
        {dailyViews}
        {selectedBucket}
        {availableBuckets}
        {bucketConfig}
        {loading}
        bucketChange={(event) => handleBucketChange(event)}
    />

    <WatcherTopPagesSection
        data={tableStates.topPages.data}
        info={topPagesInfo}
        {loading}
        on:changePage={(event) => goToPage("topPages", event.detail)}
    />

    <WatcherLatestPageViewsSection
        data={tableStates.latest.data}
        info={latestInfo}
        {loading}
        on:changePage={(event) => goToPage("latest", event.detail)}
    />

    <WatcherReferrersSection
        data={tableStates.referrers.data}
        info={referrersInfo}
        {loading}
        {includeInternalReferrers}
        on:changePage={(event) => goToPage("referrers", event.detail)}
        on:toggleInternal={(event) => handleIncludeInternalToggle(event.detail)}
    />

    <WatcherStatusSection
        data={tableStates.status.data}
        info={statusInfo}
        {loading}
        on:changePage={(event) => goToPage("status", event.detail)}
    />
</div>

<style>
    :global(.watcher-dashboard button:focus-visible),
    :global(.watcher-dashboard input:focus-visible) {
        outline: 2px solid var(--text-color);
        outline-offset: 2px;
    }

    :global(.watcher-dashboard) {
        display: flex;
        flex-direction: column;
        gap: 2lh;
    }

    :global(.watcher-dashboard .filters) {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(1lh - var(--border-thickness));
        display: flex;
        flex-direction: column;
        gap: 1.5lh;
    }

    :global(.watcher-dashboard .filters-header) {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1ch;
        align-items: baseline;
    }

    :global(.watcher-dashboard .filters-header h2) {
        margin: 0;
    }

    :global(.watcher-dashboard .filters-updated) {
        margin: 0;
        font-size: 0.75em;
    }

    :global(.watcher-dashboard .filters-loading) {
        margin: 0;
        font-style: italic;
        color: var(--text-color-alt);
    }

    :global(.watcher-dashboard .preset-buttons),
    :global(.watcher-dashboard .bucket-buttons) {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75ch;
    }

    :global(.watcher-dashboard .preset-buttons button),
    :global(.watcher-dashboard .bucket-buttons button) {
        border: var(--border-thickness) solid var(--text-color);
        background: transparent;
        color: inherit;
        padding: 0.5lh 1ch;
        cursor: pointer;
        text-transform: uppercase;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;
    }

    :global(.watcher-dashboard .preset-buttons button.selected),
    :global(.watcher-dashboard .bucket-buttons button.selected) {
        background: var(--text-color);
        color: var(--background-color);
    }

    :global(.watcher-dashboard .preset-buttons button:disabled),
    :global(.watcher-dashboard .bucket-buttons button:disabled) {
        opacity: 0.6;
        cursor: not-allowed;
    }

    :global(.watcher-dashboard .bucket-buttons) {
        margin-bottom: 0.5lh;
    }

    :global(.watcher-dashboard .filter-grid) {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(16ch, 1fr));
        gap: 1ch;
    }

    :global(.watcher-dashboard label) {
        display: flex;
        flex-direction: column;
        gap: 0.5ch;
        text-transform: uppercase;
    }

    :global(.watcher-dashboard button) {
        font: inherit;
        padding: 0.5lh 0.75ch;
        border: var(--border-thickness) solid var(--text-color);
        background: transparent;
        color: inherit;
    }

    :global(.watcher-dashboard .checkbox) {
        flex-direction: row;
        align-items: center;
        gap: 0.75ch;
        text-transform: none;
    }

    :global(.watcher-dashboard .checkbox input[type="checkbox"]) {
        width: 1em;
        height: 1em;
    }

    :global(.watcher-dashboard .filter-actions) {
        display: flex;
        gap: 1ch;
        flex-wrap: wrap;
    }

    :global(.watcher-dashboard .filter-actions button) {
        text-transform: uppercase;
        cursor: pointer;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;
    }

    :global(.watcher-dashboard .filter-actions button:disabled) {
        opacity: 0.6;
        cursor: not-allowed;
    }

    :global(.watcher-dashboard .error) {
        border: var(--border-thickness) solid currentColor;
        padding: calc(1lh - var(--border-thickness));
        display: flex;
        flex-direction: column;
        gap: 1lh;
    }

    :global(.watcher-dashboard .error button) {
        align-self: flex-start;
    }

    :global(.watcher-dashboard .summary-grid) {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18ch, 1fr));
        gap: 1ch;
    }

    :global(.watcher-dashboard .card) {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(1lh - var(--border-thickness));
        display: flex;
        flex-direction: column;
        gap: 0.75lh;
    }

    :global(.watcher-dashboard .card h3) {
        margin: 0;
        text-transform: uppercase;
    }

    :global(.watcher-dashboard .card ul) {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5lh;
    }

    :global(.watcher-dashboard .card li) {
        display: flex;
        justify-content: space-between;
        gap: 1ch;
    }

    :global(.watcher-dashboard .content-grid) {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14ch, 1fr));
        gap: 1ch;
    }

    :global(.watcher-dashboard .content-card) {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(0.75lh - var(--border-thickness));
        display: flex;
        flex-direction: column;
        gap: 0.4lh;
    }

    :global(.watcher-dashboard .content-card h3) {
        margin: 0;
        text-transform: uppercase;
    }

    :global(.watcher-dashboard .content-card p) {
        margin: 0;
    }

    :global(.watcher-dashboard .section-heading) {
        display: flex;
        align-items: baseline;
        gap: 1ch;
        flex-wrap: wrap;
    }

    :global(.watcher-dashboard .section-note) {
        margin: 0;
        font-size: 0.75em;
    }

    :global(.watcher-dashboard .graph-wrapper) {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(0.5lh - var(--border-thickness));
    }

    :global(.watcher-dashboard .graph-canvas-container) {
        position: relative;
        width: 100%;
    }

    :global(.watcher-dashboard .graph-canvas-container canvas) {
        display: block;
        width: 100%;
        height: auto;
        outline: none;
    }

    :global(.watcher-dashboard .graph-tooltip) {
        position: absolute;
        pointer-events: none;
        background: var(--surface-overlay, rgba(0, 0, 0, 0.75));
        color: var(--text-color);
        padding: calc(0.25lh);
        font-size: 0.75em;
        border-radius: 4px;
        transform: translate(-50%, calc(-100% - 8px));
        opacity: 0;
        transition: opacity 0.1s ease;
        white-space: nowrap;
    }

    :global(.watcher-dashboard .table-wrapper) {
        overflow-x: auto;
    }

    :global(.watcher-dashboard table) {
        width: 100%;
        border-collapse: collapse;
    }

    :global(.watcher-dashboard th),
    :global(.watcher-dashboard td) {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(0.5lh - var(--border-thickness))
            calc(1ch - var(--border-thickness));
        text-align: left;
        white-space: nowrap;
    }

    :global(.watcher-dashboard td) {
        white-space: normal;
        word-break: break-word;
    }

    :global(.watcher-dashboard table.wide td:first-child) {
        white-space: nowrap;
    }

    :global(.watcher-dashboard tbody tr:nth-child(even)) {
        background-color: color-mix(
            in srgb,
            var(--background-color) 85%,
            var(--text-color) 15%
        );
    }

    :global(.watcher-dashboard .pagination) {
        display: flex;
        gap: 1ch;
        align-items: center;
        margin-top: 1ch;
        flex-wrap: wrap;
    }

    :global(.watcher-dashboard .pagination button) {
        text-transform: uppercase;
        cursor: pointer;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;
    }

    :global(.watcher-dashboard .pagination button:disabled) {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: 720px) {
        :global(.watcher-dashboard .filters) {
            gap: 1lh;
        }

        :global(.watcher-dashboard .filter-grid) {
            grid-template-columns: repeat(auto-fit, minmax(14ch, 1fr));
        }
    }
</style>
