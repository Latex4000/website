<script lang="ts">
    import { onDestroy } from "svelte";
    import * as d3 from "d3";
    import type { ViewBucket } from "../../server/watcher";

    interface BucketOption {
        id: ViewBucket;
        label: string;
        durationMs: number;
    }

    const {
        dailyViews = [],
        selectedBucket,
        availableBuckets = [],
        bucketConfig = {} as Record<ViewBucket, BucketOption>,
        loading = false,
        bucketChange = (_next: ViewBucket) => {},
    }: {
        dailyViews: { date: Date; views: number }[];
        selectedBucket: ViewBucket;
        availableBuckets: BucketOption[];
        bucketConfig: Record<ViewBucket, BucketOption>;
        loading: boolean;
        bucketChange: (next: ViewBucket) => void;
    } = $props<{
        dailyViews: { date: Date; views: number }[];
        selectedBucket: ViewBucket;
        availableBuckets: BucketOption[];
        bucketConfig: Record<ViewBucket, BucketOption>;
        loading: boolean;
        bucketChange: (next: ViewBucket) => void;
    }>();

    const selectedBucketLabel = $derived(
        bucketConfig[selectedBucket]?.label ?? selectedBucket,
    );

    const numberFormatter = new Intl.NumberFormat();
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
    const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    });
    const weekRangeFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
    });
    const monthRangeFormatter = new Intl.DateTimeFormat(undefined, {
        month: "short",
        year: "2-digit",
    })

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

    function formatTickLabel(date: Date, bucket: ViewBucket): string {
        switch (bucket) {
            case "month":
                return monthRangeFormatter.format(date);
            case "week":
                return weekRangeFormatter.format(date);
            case "day":
                return shortDateFormatter.format(date);
            case "hour":
                return hourAxisFormatter.format(date);
            default:
                throw Error("Missing tick format for bucket")
        }
    }

    function formatTooltipRange(date: Date, bucket: ViewBucket): string {
        const endDate = new Date(date);
        switch (bucket) {
            case "month":
                const startMonth = monthRangeFormatter.format(date);
                endDate.setUTCMonth(endDate.getUTCMonth() + 1);
                const endMonth = monthRangeFormatter.format(endDate);
                return startMonth === endMonth
                    ? startMonth
                    : `${startMonth} – ${endMonth}`;
            case "week":
                const startWeek = weekRangeFormatter.format(date);
                endDate.setUTCDate(endDate.getUTCDate() + 7);
                const endWeek = weekRangeFormatter.format(endDate);
                return startWeek === endWeek
                    ? startWeek
                    : `${startWeek} – ${endWeek}`;
            case "day":
                return shortDateFormatter.format(date);
            case "hour":
                const startHour = hourTooltipFormatter.format(date);
                endDate.setUTCHours(endDate.getUTCHours() + 1);
                const endHour = hourTooltipFormatter.format(endDate);
                return startHour === endHour
                    ? startHour
                    : `${startHour} – ${endHour}`;
            default:
                throw Error("Missing Tooltip range format for bucket")
        }
    }

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
        bucket: ViewBucket,
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

    function drawChart(currentBucket: ViewBucket) {
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

    function handleBucketClick(next: ViewBucket) {
        if (loading || next === selectedBucket) return;
        bucketChange(next);
    }

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

    onDestroy(() => {
        if (resizeObserver && observedContainer) {
            resizeObserver.unobserve(observedContainer);
        }
        resizeObserver?.disconnect();
        resizeObserver = null;
        observedContainer = null;
    });
</script>

<section
    aria-labelledby="watcher-views-heading"
    aria-busy={loading ? "true" : "false"}
    aria-live="polite"
>
    <div class="section-heading">
        <h2 id="watcher-views-heading">Page Hits over time</h2>
        {#if dailyViews.length}
            <p class="section-note">
                Times shown in your browser timezone | Grouped by {selectedBucketLabel}.
            </p>
        {/if}
    </div>
    <div class="bucket-buttons" role="group" aria-label="Bucket size">
        {#each availableBuckets as option}
            <button
                type="button"
                class:selected={selectedBucket === option.id}
                onclick={() => handleBucketClick(option.id)}
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
                    aria-label={`Page hits over selected date range grouped by ${selectedBucketLabel.toLowerCase()} buckets`}
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
        <p role="status">Loading daily view data…</p>
    {:else}
        <p role="status">No view data available for the selected filters.</p>
    {/if}
</section>
