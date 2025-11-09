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

    const numberFormatter = new Intl.NumberFormat();
    const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    });
    const hourAxisFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
    });
    const hourTooltipFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
    const weekRangeFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    });

    function getBucketDurationMs(bucket: BucketId): number {
        return bucketConfig[bucket]?.durationMs ?? bucketConfig.day.durationMs;
    }

    function formatTickLabel(date: Date, bucket: BucketId): string {
        switch (bucket) {
            case "hour":
                return hourAxisFormatter.format(date);
            case "week":
                return weekRangeFormatter.format(date);
            case "day":
            default:
                return shortDateFormatter.format(date);
        }
    }

    function formatTooltipRange(date: Date, bucket: BucketId): string {
        const durationMs = getBucketDurationMs(bucket);
        const endExclusive = new Date(date.getTime() + durationMs);

        switch (bucket) {
            case "hour": {
                const startLabel = hourTooltipFormatter.format(date);
                const endLabel = hourTooltipFormatter.format(endExclusive);
                return startLabel === endLabel
                    ? startLabel
                    : `${startLabel} – ${endLabel}`;
            }
            case "week": {
                const startLabel = weekRangeFormatter.format(date);
                const inclusiveEnd = new Date(endExclusive.getTime() - 1);
                const endLabel = weekRangeFormatter.format(inclusiveEnd);
                return startLabel === endLabel
                    ? startLabel
                    : `${startLabel} – ${endLabel}`;
            }
            case "day":
            default:
                return shortDateFormatter.format(date);
        }
    }

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

    type BucketId = WatcherApiResponse["filters"]["bucket"];

    interface BucketOption {
        id: BucketId;
        label: string;
        durationMs: number;
        minSpanMultiplier: number;
    }

    const bucketOptions: BucketOption[] = [
        {
            id: "hour",
            label: "Hour",
            durationMs: 60 * 60 * 1000,
            minSpanMultiplier: 2,
        },
        {
            id: "day",
            label: "Day",
            durationMs: 24 * 60 * 60 * 1000,
            minSpanMultiplier: 2,
        },
        {
            id: "week",
            label: "Week",
            durationMs: 7 * 24 * 60 * 60 * 1000,
            minSpanMultiplier: 2,
        },
    ];

    const bucketConfig = bucketOptions.reduce(
        (accumulator, option) => {
            accumulator[option.id] = option;
            return accumulator;
        },
        {} as Record<BucketId, BucketOption>,
    );

    let internalHostList: string[] = $state([]);

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
    const initialBucket =
        (initialData?.filters.bucket as BucketId | undefined) ?? "day";
    let selectedBucket = $state<BucketId>(initialBucket);

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
            (option) => spanMs >= option.durationMs * option.minSpanMultiplier,
        );

        return filtered.length ? filtered : [bucketOptions[0]!];
    });

    $effect(() => {
        if (availableBuckets.some((option) => option.id === selectedBucket))
            return;
        selectedBucket = availableBuckets[0]?.id ?? "day";
    });

    function ensureBucketSelection(): BucketId {
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

    let chartContainer = $state<HTMLDivElement | null>(null);
    let canvasElement = $state<HTMLCanvasElement | null>(null);
    let tooltipElement = $state<HTMLDivElement | null>(null);
    let resizeObserver: ResizeObserver | null = null;
    let observedContainer: HTMLDivElement | null = null;
    let canvasContext: CanvasRenderingContext2D | null = null;
    let chartWidth = 0;
    let chartHeight = 0;
    let hoverPoint: { date: Date; views: number } | null = null;
    let xScale: d3.ScaleTime<number, number> | null = null;
    let yScale: d3.ScaleLinear<number, number> | null = null;

    const chartMargin = { top: 16, right: 24, bottom: 48, left: 56 };

    function ensureCanvasMetrics() {
        const container = chartContainer;
        const canvasNode = canvasElement;
        if (!container || !canvasNode) {
            canvasContext = null;
            return;
        }

        const rect = container.getBoundingClientRect();
        const deviceRatio =
            typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        const nextWidth = Math.max(240, Math.floor(rect.width));
        const nextHeight = Math.max(200, Math.floor(nextWidth * 0.5));

        if (
            chartWidth !== nextWidth ||
            chartHeight !== nextHeight ||
            !canvasContext
        ) {
            chartWidth = nextWidth;
            chartHeight = nextHeight;
            canvasNode.width = Math.floor(chartWidth * deviceRatio);
            canvasNode.height = Math.floor(chartHeight * deviceRatio);
            canvasNode.style.width = `${chartWidth}px`;
            canvasNode.style.height = `${chartHeight}px`;

            canvasContext = canvasNode.getContext("2d");
            if (canvasContext) {
                canvasContext.setTransform(
                    deviceRatio,
                    0,
                    0,
                    deviceRatio,
                    0,
                    0,
                );
                canvasContext.imageSmoothingEnabled = true;
            }
        }
    }

    function updateTooltip(
        point: { date: Date; views: number } | null,
        bucket: BucketId = selectedBucket,
    ) {
        const tooltipNode = tooltipElement;
        if (!tooltipNode) return;

        if (!point || !xScale || !yScale) {
            tooltipNode.style.opacity = "0";
            return;
        }

        const x = xScale(point.date);
        const y = yScale(point.views);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            tooltipNode.style.opacity = "0";
            return;
        }

        tooltipNode.style.left = `${x}px`;
        tooltipNode.style.top = `${y}px`;
        const label = formatTooltipRange(point.date, bucket);
        tooltipNode.textContent = `${label} · ${numberFormatter.format(point.views)}`;
        tooltipNode.style.opacity = "1";
    }

    function drawChart(currentBucket: BucketId = selectedBucket) {
        const context = canvasContext;
        if (!context) return;

        context.clearRect(0, 0, chartWidth, chartHeight);

        if (!dailyViews.length) {
            xScale = null;
            yScale = null;
            return;
        }

        const data = dailyViews;
        const extent = d3.extent(data, (d) => d.date) as [Date, Date];
        const yMax = d3.max(data, (d) => d.views) ?? 0;

        xScale = d3
            .scaleTime()
            .domain(extent)
            .range([chartMargin.left, chartWidth - chartMargin.right]);
        yScale = d3
            .scaleLinear()
            .domain([0, yMax === 0 ? 1 : yMax])
            .nice()
            .range([chartHeight - chartMargin.bottom, chartMargin.top]);

        const style =
            typeof window !== "undefined" &&
            typeof document !== "undefined" &&
            document.body
                ? getComputedStyle(document.body)
                : null;
        const textColor =
            style?.getPropertyValue("--text-color").trim() || "#ffffff";
        const axisColor =
            style?.getPropertyValue("--viz-axis").trim() || textColor;
        const gridColor =
            style?.getPropertyValue("--viz-grid").trim() ||
            "rgba(255,255,255,0.25)";
        const lineColor =
            style?.getPropertyValue("--viz-line").trim() || textColor;
        const focusColor =
            style?.getPropertyValue("--viz-focus").trim() || textColor;

        const baseFontSize = style ? Number.parseFloat(style.fontSize) : 16;
        context.font = `${Math.max(10, baseFontSize * 0.75)}px ${style?.fontFamily ?? "sans-serif"}`;

        // Horizontal grid lines
        const yTicks = yScale.ticks(6);
        context.save();
        context.strokeStyle = gridColor;
        context.lineWidth = 1;
        context.globalAlpha = 0.6;
        for (const tick of yTicks) {
            const y = yScale(tick);
            context.beginPath();
            context.moveTo(chartMargin.left, y);
            context.lineTo(chartWidth - chartMargin.right, y);
            context.stroke();
        }
        context.restore();

        // Axes
        context.save();
        context.strokeStyle = axisColor;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(chartMargin.left, chartHeight - chartMargin.bottom);
        context.lineTo(
            chartWidth - chartMargin.right,
            chartHeight - chartMargin.bottom,
        );
        context.stroke();
        context.beginPath();
        context.moveTo(chartMargin.left, chartMargin.top);
        context.lineTo(chartMargin.left, chartHeight - chartMargin.bottom);
        context.stroke();
        context.restore();

        // Y-axis labels
        context.save();
        context.fillStyle = axisColor;
        context.textAlign = "right";
        context.textBaseline = "middle";
        for (const tick of yTicks) {
            const y = yScale(tick);
            context.fillText(
                numberFormatter.format(tick),
                chartMargin.left - 8,
                y,
            );
        }
        context.restore();

        const maxTickCount = currentBucket === "hour" ? 6 : 8;
        const tickTarget = Math.min(maxTickCount, Math.max(2, data.length));
        const xTicks = xScale.ticks(tickTarget);

        context.save();
        context.fillStyle = axisColor;
        context.textAlign = "center";
        context.textBaseline = "top";
        for (const tick of xTicks) {
            const x = xScale(tick);
            context.fillText(
                formatTickLabel(tick, currentBucket),
                x,
                chartHeight - chartMargin.bottom + 8,
            );
        }
        context.restore();

        // Plot line
        context.save();
        context.strokeStyle = lineColor;
        context.lineWidth = 2;
        context.beginPath();
        data.forEach((point, index) => {
            const x = xScale!(point.date);
            const y = yScale!(point.views);
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });
        context.stroke();
        context.restore();

        // Highlight hover point
        if (hoverPoint) {
            const hx = xScale(hoverPoint.date);
            const hy = yScale(hoverPoint.views);
            context.save();
            context.fillStyle = focusColor;
            context.beginPath();
            context.arc(hx, hy, 4, 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = focusColor;
            context.lineWidth = 1.5;
            context.beginPath();
            context.arc(hx, hy, 7, 0, Math.PI * 2);
            context.stroke();
            context.restore();
        }

        // Keep tooltip in sync with latest draw
        updateTooltip(hoverPoint, currentBucket);
    }

    const bisectDate = d3.bisector<{ date: Date; views: number }, Date>(
        (d) => d.date,
    ).left;

    function findNearestPoint(x: number): { date: Date; views: number } | null {
        if (!xScale) return null;
        const date = xScale.invert(x);
        const index = bisectDate(dailyViews, date, 1);
        const previous = dailyViews[index - 1];
        const next = dailyViews[index];

        if (!previous && !next) return null;
        if (!next) return previous ?? null;
        if (!previous) return next;

        return date.getTime() - previous.date.getTime() >
            next.date.getTime() - date.getTime()
            ? next
            : previous;
    }

    function handlePointerMove(event: PointerEvent) {
        const canvasNode = canvasElement;
        if (!canvasNode || !xScale || !yScale || !dailyViews.length) return;
        const rect = canvasNode.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (
            x < chartMargin.left ||
            x > chartWidth - chartMargin.right ||
            y < chartMargin.top ||
            y > chartHeight - chartMargin.bottom
        ) {
            if (hoverPoint) {
                hoverPoint = null;
                drawChart(selectedBucket);
            }
            return;
        }

        const nearest = findNearestPoint(x);
        if (
            !nearest ||
            (hoverPoint && hoverPoint.date.getTime() === nearest.date.getTime())
        ) {
            updateTooltip(nearest ?? null, selectedBucket);
            return;
        }

        hoverPoint = nearest;
        drawChart(selectedBucket);
    }

    function handlePointerLeave() {
        if (!hoverPoint) return;
        hoverPoint = null;
        updateTooltip(null, selectedBucket);
        drawChart(selectedBucket);
    }

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
        const responseBucket = payload.filters.bucket as BucketId | undefined;
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
        const fromIso = fromInput ? dateInputToIso(fromInput) : null;
        const toIso = toInput ? dateInputToIso(toInput, true) : null;

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
    }

    function handleBucketChange(next: BucketId) {
        if (next === selectedBucket) return;
        selectedBucket = next;
        fetchAnalytics();
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

    $effect(() => {
        const container = chartContainer;
        const canvasNode = canvasElement;
        const data = dailyViews;
        const bucket = selectedBucket;

        if (!container || !canvasNode) {
            if (resizeObserver) {
                if (observedContainer) {
                    resizeObserver.unobserve(observedContainer);
                    observedContainer = null;
                }
                resizeObserver.disconnect();
                resizeObserver = null;
            }
            canvasContext = null;
            return;
        }

        ensureCanvasMetrics();

        if (!resizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                ensureCanvasMetrics();
                drawChart(selectedBucket);
            });
        }

        if (observedContainer && observedContainer !== container) {
            resizeObserver.unobserve(observedContainer);
        }

        if (observedContainer !== container) {
            resizeObserver.observe(container);
            observedContainer = container;
        }

        if (!data.length) {
            hoverPoint = null;
            updateTooltip(null, bucket);
        }

        drawChart(bucket);
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
                    Times shown in your browser timezone | Grouped by {bucketConfig[
                        selectedBucket
                    ].label}.
                </p>
            {/if}
        </div>
        <div class="bucket-buttons" role="group" aria-label="Bucket size">
            {#each availableBuckets as option}
                <button
                    type="button"
                    class:selected={selectedBucket === option.id}
                    onclick={() => handleBucketChange(option.id)}
                    aria-pressed={selectedBucket === option.id}
                    disabled={loading}
                >
                    {option.label}
                </button>
            {/each}
        </div>
        {#if dailyViews.length}
            <div class="graph-wrapper">
                <div class="graph-canvas-container" bind:this={chartContainer}>
                    <canvas
                        bind:this={canvasElement}
                        aria-label={`Views over selected date range grouped by ${bucketConfig[selectedBucket].label.toLowerCase()} buckets`}
                        onpointerenter={handlePointerMove}
                        onpointermove={handlePointerMove}
                        onpointerleave={handlePointerLeave}
                    ></canvas>
                    <div
                        class="graph-tooltip"
                        bind:this={tooltipElement}
                        aria-hidden="true"
                    ></div>
                </div>
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
                onchange={() => fetchAnalytics({ resetPagination: true })}
                disabled={loading}
            />
            <span>Include internal referrers</span>
        </label>
        {#if tableStates.referrers.data && tableStates.referrers.data.rows.length}
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Referrer</th>
                            <th scope="col">Views</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each tableStates.referrers.data.rows as row}
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

    .preset-buttons,
    .bucket-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75ch;
    }

    .preset-buttons button,
    .bucket-buttons button {
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

    .preset-buttons button.selected,
    .bucket-buttons button.selected {
        background: var(--text-color);
        color: var(--background-color);
    }

    .preset-buttons button:disabled,
    .bucket-buttons button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .bucket-buttons {
        margin-bottom: 0.5lh;
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

    .graph-canvas-container {
        position: relative;
        width: 100%;
    }

    .graph-canvas-container canvas {
        display: block;
        width: 100%;
        height: auto;
        outline: none;
    }

    .graph-tooltip {
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
