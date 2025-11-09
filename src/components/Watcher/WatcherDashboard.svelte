<script lang="ts">
    import { onMount } from "svelte";
    import * as d3 from "d3";
    import type {
        ContentCounts,
        PaginatedResult,
        TotalsResult,
        WatcherApiResponse,
    } from "../../server/watcher";

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

    const props = $props<{ data?: WatcherApiResponse | null }>();

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

    const numberFormatter = new Intl.NumberFormat();
    const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    });

    const comparisonLabels: Record<string, string> = {
        last24Hours: "Last 24 hours",
        last7Days: "Last 7 days",
        last30Days: "Last 30 days",
    };

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

    let internalHostList: string[] = $state([]);

    function isInternalReferrer(
        referrer: string | null | undefined,
        hosts: string[],
    ): boolean {
        const trimmed = referrer?.trim().toLowerCase();
        if (!trimmed) return false;

        // Relative paths are always internal
        if (trimmed.startsWith("/")) return true;

        const referrerHost = extractHost(trimmed);
        return referrerHost ? hosts.includes(referrerHost) : false;
    }

    let selectedPreset = $state<PresetId | null>(defaultPresetId);
    let fromInput = $state(
        defaultRange ? dateToInputValue(defaultRange.from) : "",
    );
    let toInput = $state(defaultRange ? dateToInputValue(defaultRange.to) : "");
    let pagePathInput = $state("");
    let referrerInput = $state("");
    let statusInput = $state("");
    let includeEmptyPath = $state(false);
    let includeInternalReferrers = $state(false);

    let tableStates = $state<TableStates>({
        topPages: { data: null, limit: 10, offset: 0 },
        latest: { data: null, limit: 20, offset: 0 },
        referrers: { data: null, limit: 50, offset: 0 },
        status: { data: null, limit: 10, offset: 0 },
    });

    let totals = $state<TotalsResult | null>(null);
    let contentCounts = $state<ContentCounts | null>(null);
    let dailyViews = $state<{ date: Date; views: number }[]>([]);

    let chartContainer = $state<HTMLDivElement | null>(null);
    let svgElement = $state<SVGSVGElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;
    let observedContainer: HTMLDivElement | null = null;

    let loading = $state(false);
    let error = $state<string | null>(null);
    let lastUpdated = $state<Date | null>(null);

    const topPagesInfo = $derived(getPageInfo(tableStates.topPages));
    const latestInfo = $derived(getPageInfo(tableStates.latest));
    const filteredReferrerRows = $derived(
        includeInternalReferrers
            ? (tableStates.referrers.data?.rows ?? [])
            : (tableStates.referrers.data?.rows ?? []).filter(
                  (row) => !isInternalReferrer(row.referrer, internalHostList),
              ),
    );

    const referrersInfo = $derived.by(() => {
        const limit =
            tableStates.referrers.data?.limit ?? tableStates.referrers.limit;
        const offset =
            tableStates.referrers.data?.offset ?? tableStates.referrers.offset;
        const total = includeInternalReferrers
            ? (tableStates.referrers.data?.total ?? filteredReferrerRows.length)
            : filteredReferrerRows.length;
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
    }

    async function fetchAnalytics({
        resetPagination = false,
    }: { resetPagination?: boolean } = {}) {
        if (resetPagination) {
            tableStates.topPages.offset = 0;
            tableStates.latest.offset = 0;
            tableStates.referrers.offset = 0;
            tableStates.status.offset = 0;
        }

        const statusCodes = parseStatusInput(statusInput);
        const params = new URLSearchParams();
        const fromIso = fromInput ? dateInputToIso(fromInput) : null;
        const toIso = toInput ? dateInputToIso(toInput, true) : null;

        if (fromIso) params.set("from", fromIso);
        if (toIso) params.set("to", toIso);
        if (pagePathInput.trim()) params.set("pagePath", pagePathInput.trim());
        if (referrerInput.trim())
            params.set("referrerQuery", referrerInput.trim());
        if (statusCodes.length) params.set("status", statusCodes.join(","));
        if (includeEmptyPath) params.set("includeEmptyPath", "true");

        params.set("topPagesLimit", `${tableStates.topPages.limit}`);
        params.set("topPagesOffset", `${tableStates.topPages.offset}`);
        params.set("latestLimit", `${tableStates.latest.limit}`);
        params.set("latestOffset", `${tableStates.latest.offset}`);
        params.set("referrersLimit", `${tableStates.referrers.limit}`);
        params.set("referrersOffset", `${tableStates.referrers.offset}`);
        params.set("statusLimit", `${tableStates.status.limit}`);
        params.set("statusOffset", `${tableStates.status.offset}`);
        params.set("timezoneOffset", `${new Date().getTimezoneOffset()}`);

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
        fetchAnalytics({ resetPagination: true });
    }

    function resetFilters() {
        const preset = presets.find(
            (candidate) => candidate.id === defaultPresetId,
        );
        selectedPreset = defaultPresetId;
        pagePathInput = "";
        referrerInput = "";
        statusInput = "";
        includeEmptyPath = false;
        includeInternalReferrers = false;
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
    }

    function renderChart() {
        const container = chartContainer;
        const svgNode = svgElement;
        if (!container || !svgNode) return;

        const data = dailyViews;
        const svgSelection = d3.select(svgNode);
        svgSelection.selectAll("*").remove();

        const containerWidth = container.clientWidth || 320;
        if (!data.length) {
            svgNode.setAttribute("width", `${containerWidth}`);
            svgNode.setAttribute("height", "180");
            return;
        }

        const margin = { top: 16, right: 24, bottom: 40, left: 52 };
        const width = Math.max(240, containerWidth);
        const height = Math.max(200, Math.floor(width * 0.5));
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        svgNode.setAttribute("width", `${width}`);
        svgNode.setAttribute("height", `${height}`);

        const xExtent = d3.extent(data, (d) => d.date) as [Date, Date];
        const xScale = d3.scaleTime().domain(xExtent).range([0, innerWidth]);
        const yMax = d3.max(data, (d) => d.views) ?? 0;
        const yScale = d3
            .scaleLinear()
            .domain([0, yMax === 0 ? 1 : yMax])
            .nice()
            .range([innerHeight, 0]);

        const rootGroup = svgSelection
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const area = d3
            .area<{ date: Date; views: number }>()
            .x((d) => xScale(d.date))
            .y0(innerHeight)
            .y1((d) => yScale(d.views))
            .curve(d3.curveMonotoneX);

        const line = d3
            .line<{ date: Date; views: number }>()
            .x((d) => xScale(d.date))
            .y((d) => yScale(d.views))
            .curve(d3.curveMonotoneX);

        const style =
            typeof window !== "undefined"
                ? getComputedStyle(document.body)
                : null;
        const textColor =
            style?.getPropertyValue("--text-color").trim() || "#ffffff";
        const background =
            style?.getPropertyValue("--background-color").trim() ||
            "rgba(255,255,255,0.2)";
        const axisColor =
            style?.getPropertyValue("--viz-axis").trim() || textColor;
        const gridColor =
            style?.getPropertyValue("--viz-grid").trim() ||
            "rgba(255,255,255,0.25)";

        rootGroup
            .append("path")
            .datum(data)
            .attr("fill", background)
            .attr("fill-opacity", 0.2)
            .attr("stroke", "none")
            .attr("d", area);

        rootGroup
            .append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", textColor)
            .attr("stroke-width", 2)
            .attr("d", line);

        const xAxis = d3
            .axisBottom<Date>(xScale)
            .ticks(Math.min(8, data.length))
            .tickFormat((value) => shortDateFormatter.format(value));

        const yAxis = d3
            .axisLeft<number>(yScale)
            .ticks(6)
            .tickFormat((value) => numberFormatter.format(value));

        const xAxisGroup = rootGroup
            .append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(xAxis);
        const yAxisGroup = rootGroup.append("g").call(yAxis);

        xAxisGroup.selectAll("path, line").attr("stroke", axisColor);
        xAxisGroup.selectAll("text").attr("fill", axisColor);

        yAxisGroup.selectAll("path, line").attr("stroke", axisColor);
        yAxisGroup.selectAll("text").attr("fill", axisColor);

        rootGroup
            .append("g")
            .attr("class", "grid")
            .call(
                d3
                    .axisLeft(yScale)
                    .ticks(6)
                    .tickSize(-innerWidth)
                    .tickFormat(() => ""),
            )
            .selectAll("line")
            .attr("stroke", gridColor)
            .attr("stroke-opacity", 0.3)
            .attr("shape-rendering", "crispEdges");

        const focusGroup = rootGroup.append("g").style("display", "none");
        focusGroup.append("circle").attr("r", 4).attr("fill", textColor);
        const focusLabel = focusGroup
            .append("text")
            .attr("text-anchor", "start")
            .attr("dy", "-0.75em")
            .attr("fill", textColor)
            .attr("font-size", "0.75em");

        const bisectDate = d3.bisector<{ date: Date; views: number }, Date>(
            (d) => d.date,
        ).left;

        function updateFocus(event: PointerEvent) {
            const point = d3.pointer(event, svgNode);
            const relativeX = point[0] - margin.left;
            if (relativeX < 0 || relativeX > innerWidth) {
                focusGroup.style("display", "none");
                return;
            }

            const date = xScale.invert(relativeX);
            const index = bisectDate(data, date, 1);
            const previous = data[index - 1];
            const next = data[index];
            const chosen = !next
                ? previous
                : !previous
                  ? next
                  : date.getTime() - previous.date.getTime() >
                      next.date.getTime() - date.getTime()
                    ? next
                    : previous;
            if (!chosen) {
                focusGroup.style("display", "none");
                return;
            }

            const cx = xScale(chosen.date);
            const cy = yScale(chosen.views);
            focusGroup
                .style("display", null)
                .attr(
                    "transform",
                    `translate(${margin.left + cx},${margin.top + cy})`,
                );
            focusLabel.text(
                `${shortDateFormatter.format(chosen.date)} · ${numberFormatter.format(chosen.views)}`,
            );
        }

        svgNode.onpointerenter = (event: PointerEvent) => {
            updateFocus(event);
        };
        svgNode.onpointermove = (event: PointerEvent) => {
            updateFocus(event);
        };
        svgNode.onpointerleave = () => {
            focusGroup.style("display", "none");
        };
    }

    $effect(() => {
        const payload = props.data ?? null;
        if (!payload) return;
        applyApiResponse(payload);
    });

    onMount(() => {
        const internalHostSet = new Set([
            ...registerHost(import.meta.env.SITE),
            ...registerHost("localhost"),
            ...registerHost("127.0.0.1"),
            ...registerHost(window.location.origin),
            ...registerHost(window.location.hostname),
        ]);
        internalHostList = Array.from(internalHostSet);

        if (!props.data) {
            fetchAnalytics({ resetPagination: false });
        }
    });

    $effect(() => {
        const container = chartContainer;
        const svgNode = svgElement;
        if (!container || !svgNode) {
            if (resizeObserver) {
                if (observedContainer) {
                    resizeObserver.unobserve(observedContainer);
                    observedContainer = null;
                }
                resizeObserver.disconnect();
                resizeObserver = null;
            }
            return;
        }

        if (!resizeObserver) {
            resizeObserver = new ResizeObserver(() => renderChart());
        }

        if (observedContainer && observedContainer !== container) {
            resizeObserver.unobserve(observedContainer);
        }

        if (observedContainer !== container) {
            resizeObserver.observe(container);
            observedContainer = container;
        }

        renderChart();
    });
</script>

<div class="watcher-dashboard">
    <section
        aria-labelledby="watcher-content-heading"
        aria-busy={loading ? "true" : "false"}
    >
        <h2 id="watcher-content-heading">Content overview</h2>
        {#if contentCounts}
            <div class="content-grid">
                <div class="content-card">
                    <h3>Members</h3>
                    <p>{numberFormatter.format(contentCounts.members)}</p>
                </div>
                <div class="content-card">
                    <h3>Actions</h3>
                    <p>{numberFormatter.format(contentCounts.actions)}</p>
                </div>
                <div class="content-card">
                    <h3>Sounds</h3>
                    <p>{numberFormatter.format(contentCounts.sounds)}</p>
                </div>
                <div class="content-card">
                    <h3>Motions</h3>
                    <p>{numberFormatter.format(contentCounts.motions)}</p>
                </div>
                <div class="content-card">
                    <h3>Sights</h3>
                    <p>{numberFormatter.format(contentCounts.sights)}</p>
                </div>
                <div class="content-card">
                    <h3>Words</h3>
                    <p>{numberFormatter.format(contentCounts.words)}</p>
                </div>
            </div>
        {:else if loading}
            <p>Loading content counts…</p>
        {:else}
            <p>No published content found.</p>
        {/if}
    </section>
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
        <div class="sr-only" aria-live="polite" role="status">
            {#if loading}
                Loading…
            {/if}
        </div>
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

    <section
        aria-labelledby="watcher-views-heading"
        aria-busy={loading ? "true" : "false"}
    >
        <div class="section-heading">
            <h2 id="watcher-views-heading">Views over time</h2>
            {#if dailyViews.length}
                <p class="section-note">
                    Times shown in your browser timezone.
                </p>
            {/if}
        </div>
        {#if dailyViews.length}
            <div class="graph-wrapper" bind:this={chartContainer}>
                <svg
                    bind:this={svgElement}
                    role="img"
                    aria-label="Views over selected date range"
                ></svg>
            </div>
        {:else if loading}
            <p>Loading daily view data…</p>
        {:else}
            <p>No view data available for the selected filters.</p>
        {/if}
    </section>

    <section
        aria-labelledby="watcher-top-pages-heading"
        aria-busy={loading ? "true" : "false"}
    >
        <h2 id="watcher-top-pages-heading">Top pages</h2>
        {#if tableStates.topPages.data && tableStates.topPages.data.rows.length}
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Path</th>
                            <th scope="col">Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each tableStates.topPages.data.rows as row}
                            <tr>
                                <td>{row.path}</td>
                                <td>{numberFormatter.format(row.views)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            {#if topPagesInfo.pageCount > 1}
                <div class="pagination">
                    <button
                        type="button"
                        onclick={() =>
                            goToPage("topPages", topPagesInfo.pageIndex - 1)}
                        disabled={loading || topPagesInfo.pageIndex === 0}
                    >
                        Previous
                    </button>
                    <span
                        >Page {topPagesInfo.pageIndex + 1} of {topPagesInfo.pageCount}</span
                    >
                    <button
                        type="button"
                        onclick={() =>
                            goToPage("topPages", topPagesInfo.pageIndex + 1)}
                        disabled={loading ||
                            topPagesInfo.pageIndex + 1 >=
                                topPagesInfo.pageCount}
                    >
                        Next
                    </button>
                </div>
            {/if}
        {:else if loading}
            <p>Loading top pages…</p>
        {:else}
            <p>No page view data found.</p>
        {/if}
    </section>

    <section
        aria-labelledby="watcher-latest-heading"
        aria-busy={loading ? "true" : "false"}
    >
        <h2 id="watcher-latest-heading">Latest page views</h2>
        {#if tableStates.latest.data && tableStates.latest.data.rows.length}
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
                        {#each tableStates.latest.data.rows as row}
                            <tr>
                                <td
                                    >{new Date(
                                        row.createdAt,
                                    ).toLocaleString()}</td
                                >
                                <td>{row.path}</td>
                                <td>{row.status}</td>
                                <td>{row.referrer ?? ""}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            {#if latestInfo.pageCount > 1}
                <div class="pagination">
                    <button
                        type="button"
                        onclick={() =>
                            goToPage("latest", latestInfo.pageIndex - 1)}
                        disabled={loading || latestInfo.pageIndex === 0}
                    >
                        Previous
                    </button>
                    <span
                        >Page {latestInfo.pageIndex + 1} of {latestInfo.pageCount}</span
                    >
                    <button
                        type="button"
                        onclick={() =>
                            goToPage("latest", latestInfo.pageIndex + 1)}
                        disabled={loading ||
                            latestInfo.pageIndex + 1 >= latestInfo.pageCount}
                    >
                        Next
                    </button>
                </div>
            {/if}
        {:else if loading}
            <p>Loading recent page views…</p>
        {:else}
            <p>No recent page views found.</p>
        {/if}
    </section>

    <section
        aria-labelledby="watcher-referrers-heading"
        aria-busy={loading ? "true" : "false"}
    >
        <h2 id="watcher-referrers-heading">Top referrers</h2>
        <label class="checkbox">
            <input
                type="checkbox"
                bind:checked={includeInternalReferrers}
                disabled={loading}
            />
            <span>Include internal referrers</span>
        </label>
        {#if tableStates.referrers.data && filteredReferrerRows.length}
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Referrer</th>
                            <th scope="col">Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each filteredReferrerRows as row}
                            <tr>
                                <td>{row.referrer || "Direct"}</td>
                                <td>{numberFormatter.format(row.views)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            {#if referrersInfo.pageCount > 1}
                <div class="pagination">
                    <button
                        type="button"
                        onclick={() =>
                            goToPage("referrers", referrersInfo.pageIndex - 1)}
                        disabled={loading || referrersInfo.pageIndex === 0}
                    >
                        Previous
                    </button>
                    <span
                        >Page {referrersInfo.pageIndex + 1} of {referrersInfo.pageCount}</span
                    >
                    <button
                        type="button"
                        onclick={() =>
                            goToPage("referrers", referrersInfo.pageIndex + 1)}
                        disabled={loading ||
                            referrersInfo.pageIndex + 1 >=
                                referrersInfo.pageCount}
                    >
                        Next
                    </button>
                </div>
            {/if}
        {:else if loading}
            <p>Loading referrer data…</p>
        {:else}
            <p>No referrer information for this range.</p>
        {/if}
    </section>

    <section
        aria-labelledby="watcher-status-heading"
        aria-busy={loading ? "true" : "false"}
    >
        <h2 id="watcher-status-heading">Status codes</h2>
        {#if tableStates.status.data && tableStates.status.data.rows.length}
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Status</th>
                            <th scope="col">Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each tableStates.status.data.rows as row}
                            <tr>
                                <td>{row.status}</td>
                                <td>{numberFormatter.format(row.views)}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            {#if statusInfo.pageCount > 1}
                <div class="pagination">
                    <button
                        type="button"
                        onclick={() =>
                            goToPage("status", statusInfo.pageIndex - 1)}
                        disabled={loading || statusInfo.pageIndex === 0}
                    >
                        Previous
                    </button>
                    <span
                        >Page {statusInfo.pageIndex + 1} of {statusInfo.pageCount}</span
                    >
                    <button
                        type="button"
                        onclick={() =>
                            goToPage("status", statusInfo.pageIndex + 1)}
                        disabled={loading ||
                            statusInfo.pageIndex + 1 >= statusInfo.pageCount}
                    >
                        Next
                    </button>
                </div>
            {/if}
        {:else if loading}
            <p>Loading status breakdown…</p>
        {:else}
            <p>No status data for this range.</p>
        {/if}
    </section>
</div>

<style>
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
    }

    button:focus-visible,
    input:focus-visible {
        outline: 2px solid var(--text-color);
        outline-offset: 2px;
    }

    .watcher-dashboard {
        display: flex;
        flex-direction: column;
        gap: 2lh;
    }

    .filters {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(1lh - var(--border-thickness));
        display: flex;
        flex-direction: column;
        gap: 1.5lh;
    }

    .filters-header {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1ch;
        align-items: baseline;
    }

    .filters-header h2 {
        margin: 0;
    }

    .filters-updated {
        margin: 0;
        font-size: 0.75em;
    }

    .preset-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75ch;
    }

    .preset-buttons button {
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

    .preset-buttons button.selected {
        background: var(--text-color);
        color: var(--background-color);
    }

    .preset-buttons button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(16ch, 1fr));
        gap: 1ch;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.5ch;
        text-transform: uppercase;
    }

    button {
        font: inherit;
        padding: 0.5lh 0.75ch;
        border: var(--border-thickness) solid var(--text-color);
        background: transparent;
        color: inherit;
    }

    .checkbox {
        flex-direction: row;
        align-items: center;
        gap: 0.75ch;
        text-transform: none;
    }

    .checkbox input[type="checkbox"] {
        width: 1em;
        height: 1em;
    }

    .filter-actions {
        display: flex;
        gap: 1ch;
        flex-wrap: wrap;
    }

    .filter-actions button {
        text-transform: uppercase;
        cursor: pointer;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;
    }

    .filter-actions button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .error {
        border: var(--border-thickness) solid currentColor;
        padding: calc(1lh - var(--border-thickness));
        display: flex;
        flex-direction: column;
        gap: 1lh;
    }

    .error button {
        align-self: flex-start;
    }

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(18ch, 1fr));
        gap: 1ch;
    }

    .card {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(1lh - var(--border-thickness));
        display: flex;
        flex-direction: column;
        gap: 0.75lh;
    }

    .card h3 {
        margin: 0;
        text-transform: uppercase;
    }

    .card ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5lh;
    }

    .card li {
        display: flex;
        justify-content: space-between;
        gap: 1ch;
    }

    .content-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(14ch, 1fr));
        gap: 1ch;
    }

    .content-card {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(0.75lh - var(--border-thickness));
        display: flex;
        flex-direction: column;
        gap: 0.4lh;
    }

    .content-card h3 {
        margin: 0;
        text-transform: uppercase;
    }

    .content-card p {
        margin: 0;
    }

    .section-heading {
        display: flex;
        align-items: baseline;
        gap: 1ch;
        flex-wrap: wrap;
    }

    .section-note {
        margin: 0;
        font-size: 0.75em;
    }

    .graph-wrapper {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(0.5lh - var(--border-thickness));
    }

    .graph-wrapper svg {
        width: 100%;
        height: auto;
        display: block;
    }

    .table-wrapper {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th,
    td {
        border: var(--border-thickness) solid var(--text-color);
        padding: calc(0.5lh - var(--border-thickness))
            calc(1ch - var(--border-thickness));
        text-align: left;
        white-space: nowrap;
    }

    td {
        white-space: normal;
        word-break: break-word;
    }

    table.wide td:first-child {
        white-space: nowrap;
    }

    tbody tr:nth-child(even) {
        background-color: color-mix(
            in srgb,
            var(--background-color) 85%,
            var(--text-color) 15%
        );
    }

    .pagination {
        display: flex;
        gap: 1ch;
        align-items: center;
        margin-top: 1ch;
        flex-wrap: wrap;
    }

    .pagination button {
        text-transform: uppercase;
        cursor: pointer;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;
    }

    .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    @media (max-width: 720px) {
        .filters {
            gap: 1lh;
        }

        .filter-grid {
            grid-template-columns: repeat(auto-fit, minmax(14ch, 1fr));
        }
    }
</style>
