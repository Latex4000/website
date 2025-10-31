<script lang="ts">
    import { onMount } from "svelte";
    import * as d3 from "d3";
    import dataFile from "../../data/messageData.json";
    import { type MessageData } from "../../typing/messageData";

    const fallbackGridColor = "rgba(187, 187, 187, 0.45)";
    const fallbackAxisColor = "#ffffff";
    const fallbackFocusColor = "#ffffff";

    let focusColor = fallbackFocusColor;

    function readCssVar(
        style: CSSStyleDeclaration | null,
        name: string,
    ): string {
        if (!style) return "";
        return style.getPropertyValue(name).trim();
    }

    function buildSeriesPalette(
        style: CSSStyleDeclaration | null,
        count: number,
    ): string[] {
        const raw = readCssVar(style, "--viz-series-palette");
        const parsed = raw
            .split(/[|,]/)
            .map((token) => token.trim())
            .filter(Boolean);

        if (!parsed.length) {
            const size = count > 0 ? count : 10;
            return Array.from({ length: size }, (_, index) => {
                const ratio = size <= 1 ? 0.5 : index / Math.max(1, size - 1);
                return d3.interpolatePuBuGn(ratio);
            });
        }

        if (!count) return parsed;

        return Array.from(
            { length: count },
            (_, index) => parsed[index % parsed.length]!,
        );
    }

    let interval = $state("week");
    let windowSize = $state(3);
    let includeBotMessages = $state(false);

    let rawData: MessageData[] = dataFile
        .filter((d: any) => d.channelName && d.channelName.trim() !== "")
        .map((d: any) => ({
            channelName: d.channelName,
            channelID: d.channelID,
            date: new Date(d.date),
            count: +d.count,
            countWithoutBot: +d.countWithoutBot,
            order: +d.order,
        }));

    const channelRollup = d3
        .rollups(
            rawData,
            (v) => v[0],
            (d) => d.channelID,
        )
        .map(([_, val]) => val!)
        .sort((a, b) => d3.ascending(a.order, b.order));

    let allChannelData = channelRollup;
    let selectedChannels: (string | "all")[] = $state(["all"]);

    let channelMenuVisible = $state(false);

    let chartRef: HTMLDivElement;
    let canvasRef: HTMLCanvasElement;
    let tooltipRef: HTMLDivElement;
    let legendRef: HTMLDivElement;

    let earliestDate = d3.min(rawData, (d) => d.date) ?? new Date();
    let latestDate = d3.max(rawData, (d) => d.date) ?? new Date();

    let width: number;
    let height: number;
    const margin = { top: 0, right: 0, bottom: 30, left: 40 };

    let context: CanvasRenderingContext2D | null;

    let xScale: d3.ScaleTime<number, number>;
    let yScale: d3.ScaleLinear<number, number>;
    let xOrig: d3.ScaleTime<number, number>;
    let yOrig: d3.ScaleLinear<number, number>;

    let currentChannels: MessageData[][] = [];
    let focusedChannel: string | null = null;
    let focusLock = false;
    let colorRange: string[] = [];
    let zoomBehavior: any;

    function toggleChannelMenu() {
        channelMenuVisible = !channelMenuVisible;
    }

    function groupDataByInterval(data: MessageData[], intv: string) {
        const truncatedData = data.map((d) => {
            const dt = new Date(d.date);
            let newDt = dt;
            if (intv === "day")
                newDt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
            else if (intv === "week") {
                const day = dt.getDay();
                newDt = new Date(dt);
                newDt.setDate(dt.getDate() - day);
                newDt.setHours(0, 0, 0, 0);
            } else if (intv === "month")
                newDt = new Date(dt.getFullYear(), dt.getMonth(), 1);

            return {
                ...d,
                date: newDt,
                count: includeBotMessages ? d.count : d.countWithoutBot,
            };
        });

        const channelMap = d3.group(truncatedData, (d) => d.channelID);
        const result: MessageData[][] = [];
        channelMap.forEach((arr, channelID) => {
            const dateMap = d3.rollup(
                arr,
                (v) => d3.sum(v, (d) => d.count),
                (d) => +d.date,
            );
            const chOrder = arr[0]?.order ?? 99999;
            const chName = arr[0]?.channelName ?? channelID;
            const groupedArray = Array.from(dateMap, ([time, count]) => ({
                date: new Date(time),
                count,
                countWithoutBot: count, // This will be the processed count
                channelName: chName,
                channelID: channelID,
                order: chOrder,
            }));
            groupedArray.sort((a, b) => +a.date - +b.date);
            result.push(groupedArray);
        });
        return result;
    }

    function movingAverage(series: MessageData[], windowSize: number) {
        const result: MessageData[] = [];
        for (let i = 0; i < series.length; i++) {
            const start = Math.max(0, i - (windowSize - 1));
            const window = series.slice(start, i + 1);
            const avg = d3.mean(window, (d) => d.count) ?? 0;
            result.push({
                ...series[i]!,
                count: avg,
            });
        }
        return result;
    }

    function getAggregateTimeSeries(channelsArray: MessageData[][]) {
        const dateMap = new Map<number, number>();
        for (const series of channelsArray)
            for (const d of series) {
                const t = +d.date;
                dateMap.set(t, (dateMap.get(t) ?? 0) + d.count);
            }

        const merged: MessageData[] = [];
        for (const [time, sum] of dateMap.entries())
            merged.push({
                date: new Date(time),
                count: sum,
                countWithoutBot: sum,
                channelName: "Total",
                channelID: "aggregate-total",
                order: 99999,
            });

        merged.sort((a, b) => +a.date - +b.date);
        return merged;
    }

    function labelSeries(series: MessageData[], label: string, order: number) {
        return series.map((d) => ({
            ...d,
            channelName: label,
            channelID: "aggregate",
            order,
        }));
    }

    function setupScales(channelsArray: MessageData[][]) {
        let allPoints = channelsArray.flat();
        let xDomain = [earliestDate, latestDate];
        let yMax = d3.max(allPoints, (d) => d.count) ?? 0;

        // If a channel is focus locked, scale to that channel's data range
        if (focusedChannel && focusLock) {
            const focusedSeries = channelsArray.find(
                (arr) => arr[0]?.channelID === focusedChannel,
            );
            if (focusedSeries && focusedSeries.length > 0) {
                const focusedPoints = focusedSeries;
                const xMin =
                    d3.min(focusedPoints, (d) => d.date) ?? earliestDate;
                const xMax = d3.max(focusedPoints, (d) => d.date) ?? latestDate;
                xDomain = [xMin, xMax];
                yMax = d3.max(focusedPoints, (d) => d.count) ?? 0;
            }
        }

        xOrig = d3
            .scaleTime()
            .domain(xDomain)
            .range([margin.left, width - margin.right]);
        yOrig = d3
            .scaleLinear()
            .domain([0, yMax])
            .nice()
            .range([height - margin.bottom, margin.top]);
        xScale = xOrig.copy();
        yScale = yOrig.copy();
    }

    function drawLines(channelsArray: MessageData[][]) {
        if (!context) return;
        context.clearRect(0, 0, width, height);
        context.font = `${parseFloat(getComputedStyle(document.body).fontSize) / 2}px ${getComputedStyle(document.body).fontFamily}`;

        const xTicks = xScale.ticks(5);
        const yTicks = yScale.ticks(6);

        // X ticks
        const style =
            typeof document !== "undefined" && document.body
                ? getComputedStyle(document.body)
                : null;

        const gridColor = readCssVar(style, "--viz-grid") || fallbackGridColor;
        const axisColor = readCssVar(style, "--viz-axis") || fallbackAxisColor;
        const resolvedFocusColor =
            readCssVar(style, "--viz-focus") || fallbackFocusColor;
        focusColor = resolvedFocusColor;

        context.beginPath();
        context.strokeStyle = gridColor;
        xTicks.forEach((t) => {
            const tx = xScale(t);
            context!.moveTo(tx, height - margin.bottom);
            context!.lineTo(tx, height - margin.bottom + 5);
        });
        context.stroke();

        context.textAlign = "center";
        context.textBaseline = "top";
        context.fillStyle = axisColor;
        xTicks.forEach((t) => {
            const tx = xScale(t);
            context!.fillText(
                d3.utcFormat("%b %d %Y")(t),
                tx,
                height - margin.bottom + 8,
            );
        });

        // Y ticks
        context.beginPath();
        context.strokeStyle = gridColor;
        yTicks.forEach((t) => {
            const ty = yScale(t);
            context!.moveTo(margin.left, ty);
            context!.lineTo(margin.left - 5, ty);
        });
        context.stroke();

        context.textAlign = "right";
        context.textBaseline = "middle";
        context.fillStyle = axisColor;
        yTicks.forEach((t) => {
            const ty = yScale(t);
            context!.fillText(`${t}`, margin.left - 8, ty);
        });

        const channels = channelsArray
            .map((arr) => arr[0]?.channelID)
            .filter(Boolean) as string[];
        colorRange = buildSeriesPalette(style, channels.length);
        const color = d3.scaleOrdinal(colorRange).domain(channels);

        channelsArray.forEach((series) => {
            if (!series.length) return;
            const channelID = series[0]?.channelID;
            context!.beginPath();
            context!.strokeStyle = color(channelID!)!;
            context!.lineWidth = 2;

            if (focusedChannel && channelID !== focusedChannel)
                context!.globalAlpha = 0.1;

            series.forEach((d, i) => {
                const cx = xScale(d.date);
                const cy = yScale(d.count);
                if (i === 0) context!.moveTo(cx, cy);
                else context!.lineTo(cx, cy);
            });
            context!.stroke();
            context!.globalAlpha = 1.0;
        });
    }

    function drawLegend(channels: string[]) {
        if (!legendRef) return;
        legendRef.innerHTML = "";

        const channelToOrder = new Map<string, number>();
        const channelToName = new Map<string, string>();
        for (const series of currentChannels)
            if (series.length) {
                channelToOrder.set(series[0]!.channelID, series[0]!.order);
                channelToName.set(series[0]!.channelID, series[0]!.channelName);
            }

        // Sort channel IDs by their known order
        const sortedChannels = channels
            .map((chID) => ({
                id: chID,
                order: channelToOrder.get(chID) ?? 99999,
                name: channelToName.get(chID) ?? chID,
            }))
            .sort((a, b) => d3.ascending(a.order, b.order));
        const color = d3.scaleOrdinal(colorRange).domain(channels);

        sortedChannels.forEach((chObj) => {
            const chID = chObj.id;
            const chName = chObj.name;
            const item = document.createElement("a");
            item.onclick = () => {
                const wasUnlocking = focusedChannel === chID && focusLock;
                focusedChannel =
                    focusedChannel === chID && focusLock ? null : chID;
                focusLock = !focusLock;

                // If we're changing focus state, update the chart to rescale
                if (wasUnlocking || (!wasUnlocking && focusLock)) {
                    updateChart();
                } else {
                    drawLines(currentChannels);
                }
            };
            item.textContent = chName;
            item.style.color = color(chID)!;
            item.style.cursor = "pointer";
            item.style.userSelect = "none";
            item.style.marginRight = "var(--space-static-md)";
            legendRef.appendChild(item);
        });
    }

    function updateChart() {
        if (!canvasRef || !chartRef) return;
        const rect = chartRef.getBoundingClientRect();
        width = rect.width;
        height = Math.floor(width * 0.6);

        canvasRef.width = width;
        canvasRef.height = height;
        context = canvasRef.getContext("2d");

        const allGrouped = groupDataByInterval(rawData, interval);
        const allSmoothed = allGrouped.map((s) =>
            movingAverage(s, +windowSize),
        );

        const allChecked = selectedChannels.includes("all");
        const selected = selectedChannels.filter((ch) => ch !== "all");

        let chosen = [...allSmoothed];
        let totalAllLabeled: MessageData[] = [];
        let selectedTotal: MessageData[] = [];

        if (allChecked) {
            let totalAll = getAggregateTimeSeries(allSmoothed);
            totalAll = movingAverage(totalAll, +windowSize);
            totalAllLabeled = labelSeries(totalAll, "Total", 99999);
            chosen = allSmoothed;
        } else
            chosen = allSmoothed.filter((arr) => {
                const chID = arr[0]?.channelID;
                return chID && selected.includes(chID);
            });

        if (chosen.length > 1 && !allChecked) {
            selectedTotal = getAggregateTimeSeries(chosen);
            selectedTotal = movingAverage(selectedTotal, +windowSize);
            selectedTotal = labelSeries(selectedTotal, "Selected Total", 99998);
        }

        const finalSeriesArray: MessageData[][] = [
            ...chosen,
            ...(totalAllLabeled.length ? [totalAllLabeled] : []),
            ...(selectedTotal.length ? [selectedTotal] : []),
        ];

        if (!finalSeriesArray.flat().length) {
            if (context) context.clearRect(0, 0, width, height);
            if (legendRef) legendRef.innerHTML = "(No data/selection)";
            return;
        }

        setupScales(finalSeriesArray);
        currentChannels = finalSeriesArray;
        drawLines(currentChannels);

        // Legend sorted by order
        const channelObjects = finalSeriesArray
            .map((arr) => arr[0]!)
            .filter(Boolean)
            .sort((a, b) => d3.ascending(a.order, b.order));
        const channelIDs = channelObjects.map((d) => d.channelID);
        drawLegend(channelIDs);

        // Zoom
        zoomBehavior = d3
            .zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([1, 20])
            .translateExtent([
                [margin.left, margin.top],
                [width - margin.right, height - margin.bottom],
            ])
            .on("zoom", (event) => {
                const transform = event.transform;
                xScale = transform.rescaleX(xOrig);
                yScale = transform.rescaleY(yOrig);
                xScale.domain([
                    Math.max(+xOrig.domain()[0]!, +xScale.domain()[0]!),
                    Math.min(+xOrig.domain()[1]!, +xScale.domain()[1]!),
                ]);
                drawLines(currentChannels);
            });

        d3.select(canvasRef).call(zoomBehavior);
    }

    function handleThemeChange() {
        updateChart();
    }

    function onCanvasClick(e: MouseEvent) {
        if (!currentChannels.length || !canvasRef || !context) return;
        const rect = canvasRef.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let closest: MessageData | null = null;
        let minDist = Infinity;

        for (const series of currentChannels)
            for (const d of series) {
                const dx = xScale(d.date) - mx;
                const dy = yScale(d.count) - my;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    closest = d;
                }
            }

        if (closest) {
            const wasUnlocking =
                focusedChannel === closest.channelID && focusLock;
            focusedChannel =
                focusedChannel === closest.channelID && focusLock
                    ? null
                    : closest.channelID;
            focusLock = !focusLock;

            // If we're changing focus state, update the chart to rescale
            if (wasUnlocking || (!wasUnlocking && focusLock)) {
                updateChart();
            } else {
                drawLines(currentChannels);
            }
        }
    }

    function onCanvasMouseMove(e: MouseEvent) {
        if (!currentChannels.length || !canvasRef || !tooltipRef) return;
        const rect = canvasRef.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        let closest: MessageData | null = null;
        let minDist = Infinity;

        if (focusedChannel && focusLock) {
            const focusSeries = currentChannels.find(
                (arr) => arr[0]?.channelID === focusedChannel,
            );
            if (focusSeries)
                for (const d of focusSeries) {
                    const dx = xScale(d.date) - mx;
                    const dy = yScale(d.count) - my;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        closest = d;
                    }
                }
        } else
            for (const series of currentChannels) {
                for (const d of series) {
                    const dx = xScale(d.date) - mx;
                    const dy = yScale(d.count) - my;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        closest = d;
                    }
                }
            }

        if (!closest) {
            tooltipRef.style.visibility = "hidden";
            return;
        }

        if (!focusLock) {
            focusedChannel = closest.channelID;
            drawLines(currentChannels);
        }

        tooltipRef.style.left = xScale(closest.date) + 10 + "px";
        tooltipRef.style.top = yScale(closest.count) - 10 + "px";
        tooltipRef.style.visibility = "visible";
        tooltipRef.innerHTML = `
    <div><b>${closest.channelName}</b></div>
    <div>${d3.utcFormat("%b %d %Y")(closest.date)}</div>
    <div>${closest.count.toFixed()}</div>
`;

        if (context) {
            drawLines(currentChannels);

            const channels = currentChannels
                .map((arr) => arr[0]?.channelID)
                .filter(Boolean) as string[];
            const color = d3.scaleOrdinal(colorRange).domain(channels);
            const circleColor =
                color(closest.channelID) || focusColor || fallbackFocusColor;

            context.beginPath();
            context.arc(
                xScale(closest.date),
                yScale(closest.count),
                5,
                0,
                2 * Math.PI,
            );

            const gradient = context.createRadialGradient(
                xScale(closest.date),
                yScale(closest.count),
                0,
                xScale(closest.date),
                yScale(closest.count),
                5,
            );
            gradient.addColorStop(0, circleColor);
            gradient.addColorStop(0.5, circleColor);
            gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
            context.fillStyle = gradient;

            context.fill();
        }
    }

    function onCanvasMouseLeave() {
        if (!tooltipRef) return;
        tooltipRef.style.visibility = "hidden";
        if (!focusLock) {
            focusedChannel = null;
            drawLines(currentChannels);
        }
    }

    onMount(() => {
        window.addEventListener("resize", updateChart);
        window.addEventListener("themechange", handleThemeChange);
        updateChart();
    });

    // re-runs whenever props change
    $effect(() => updateChart());
</script>

<div class="chartOptions">
    <label for="interval">Group by:</label>
    <select id="interval" bind:value={interval}>
        <option value="day">Day</option>
        <option value="week" selected>Week</option>
        <option value="month">Month</option>
    </select>

    <label for="windowSize">Window Size:</label>
    <input id="windowSize" type="number" min="1" bind:value={windowSize} />

    <label>
        <input type="checkbox" bind:checked={includeBotMessages} />
        Include bot/app messages
    </label>

    <div class="dropdown">
        <button type="button" onclick={toggleChannelMenu}> Channels: </button>
        {#if channelMenuVisible}
            <div class="dropdown-content">
                <label>
                    <input
                        type="checkbox"
                        value="all"
                        checked={selectedChannels.includes("all")}
                        onchange={(e) => {
                            const checked = (e.target as HTMLInputElement)
                                .checked;
                            if (checked) selectedChannels = ["all"];
                            else
                                selectedChannels = selectedChannels.filter(
                                    (ch) => ch !== "all",
                                );
                        }}
                    />
                    All
                </label>
                {#each allChannelData as channelData}
                    <label>
                        <input
                            type="checkbox"
                            value={channelData.channelID}
                            checked={selectedChannels.includes(
                                channelData.channelID,
                            )}
                            onchange={(e) => {
                                const checked = (e.target as HTMLInputElement)
                                    .checked;
                                if (checked)
                                    selectedChannels = [
                                        ...selectedChannels.filter(
                                            (ch) => ch !== "all",
                                        ),
                                        channelData.channelID,
                                    ];
                                else
                                    selectedChannels = selectedChannels.filter(
                                        (item) =>
                                            item !== channelData.channelID,
                                    );
                            }}
                        />
                        {channelData.channelName}
                    </label>
                {/each}
            </div>
        {/if}
    </div>
</div>

<div id="chart" bind:this={chartRef}>
    <canvas
        bind:this={canvasRef}
        onmousemove={onCanvasMouseMove}
        onmouseleave={onCanvasMouseLeave}
        onclick={onCanvasClick}
    ></canvas>
    <div id="tooltip" bind:this={tooltipRef}></div>
</div>

<div id="legend" bind:this={legendRef}></div>

<style>
    .chartOptions {
        display: flex;
        flex-direction: column;
        gap: var(--line-height);
        margin-bottom: var(--line-height);
    }

    .dropdown-content {
        position: absolute;
        background: var(--surface-overlay-strong);
        color: var(--text-on-overlay);
        padding: var(--space-static-xs);
        display: flex;
        flex-direction: column;
        gap: var(--line-height);
        z-index: 10;
    }

    #chart {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--line-height);
    }

    #tooltip {
        position: absolute;
        pointer-events: none;
        background: var(--surface-overlay);
        color: var(--text-on-overlay);
        padding: var(--space-static-xs);
        font-size: var(--font-size-sm);
        visibility: hidden;
        z-index: 999;
    }

    #legend {
        display: flex;
        gap: var(--line-height);
        flex-wrap: wrap;
        margin-bottom: var(--space-static-md);
    }
</style>
