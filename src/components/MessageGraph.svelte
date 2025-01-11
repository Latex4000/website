<script lang="ts">
import { onMount } from "svelte";
import * as d3 from "d3";
import dataFile from "../data/messageData.json";
import { type MessageData } from "../typing/messageData";

let interval = $state("week");
let windowSize = $state(3);

let rawData: MessageData[] = dataFile.map((d: any) => ({
    channelName: d.channelName,
    date: new Date(d.date),
    count: +d.count,
    order: +d.order
}));

const channelRollup = d3.rollups(
    rawData,
    (v) => v[0],
    (d) => d.channelName
)
.map(([_, val]) => val!)
.sort((a, b) => d3.ascending(a.order, b.order));

let allChannelNames = channelRollup.map(d => d.channelName);
let selectedChannels: (string | "all")[] = $state(["all"]);

let channelMenuVisible = $state(false);

let chartRef: HTMLDivElement;
let canvasRef: HTMLCanvasElement;
let tooltipRef: HTMLDivElement;
let legendRef: HTMLDivElement;

let earliestDate = d3.min(rawData, d => d.date) ?? new Date();
let latestDate = d3.max(rawData, d => d.date) ?? new Date();

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
    const truncatedData = data.map(d => {
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
            date: newDt
        };
    });

    const channelMap = d3.group(truncatedData, d => d.channelName);
    const result: MessageData[][] = [];
    channelMap.forEach((arr, channelName) => {
        const dateMap = d3.rollup(
            arr,
            v => d3.sum(v, d => d.count),
            d => +d.date
        );
        const chOrder = arr[0]?.order ?? 99999;
        const groupedArray = Array.from(dateMap, ([time, count]) => ({
            date: new Date(time),
            count,
            channelName,
            order: chOrder
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
        const avg = d3.mean(window, d => d.count) ?? 0;
        result.push({
            ...series[i]!,
            count: avg
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
        merged.push({ date: new Date(time), count: sum, channelName: "Total", order: 99999 });

    merged.sort((a, b) => +a.date - +b.date);
    return merged;
}

function labelSeries(series: MessageData[], label: string, order: number) {
    return series.map(d => ({ ...d, channelName: label, order }));
}

function setupScales(channelsArray: MessageData[][]) {
    const allPoints = channelsArray.flat();
    const yMax = d3.max(allPoints, d => d.count) ?? 0;
    xOrig = d3
        .scaleTime()
        .domain([earliestDate, latestDate])
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

    const xTicks = xScale.ticks(5);
    const yTicks = yScale.ticks(6);

    // X ticks
    context.beginPath();
    context.strokeStyle = "#bbb";
    xTicks.forEach(t => {
    const tx = xScale(t);
        context!.moveTo(tx, height - margin.bottom);
        context!.lineTo(tx, height - margin.bottom + 5);
    });
    context.stroke();

    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillStyle = "#fff";
    xTicks.forEach(t => {
        const tx = xScale(t);
        context!.fillText(d3.utcFormat("%b %d %Y")(t), tx, height - margin.bottom + 8);
    });

    // Y ticks
    context.beginPath();
    context.strokeStyle = "#bbb";
    yTicks.forEach(t => {
        const ty = yScale(t);
        context!.moveTo(margin.left, ty);
        context!.lineTo(margin.left - 5, ty);
    });
    context.stroke();

    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    yTicks.forEach(t => {
        const ty = yScale(t);
        context!.fillText(`${t}`, margin.left - 8, ty);
    });

    const channels = channelsArray.map(arr => arr[0]?.channelName).filter(Boolean) as string[];
    colorRange = channels
        .map((_, i) => d3.interpolatePuBuGn(i / ((channels.length - 1) || 1)));
    const color = d3.scaleOrdinal(colorRange).domain(channels);

    channelsArray.forEach(series => {
        if (!series.length) return;
        const channel = series[0]?.channelName;
        context!.beginPath();
        context!.strokeStyle = color(channel!)!;
        context!.lineWidth = 2;

        if (focusedChannel && channel !== focusedChannel) context!.globalAlpha = 0.1;

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
    for (const series of currentChannels)
        if (series.length)
            channelToOrder.set(series[0]!.channelName, series[0]!.order);

    // Sort channel names by their known order
    const sortedChannels = channels
        .map(ch => ({ name: ch, order: channelToOrder.get(ch) ?? 99999 }))
        .sort((a, b) => d3.ascending(a.order, b.order));
    const color = d3.scaleOrdinal(colorRange).domain(channels);

    sortedChannels.forEach(chObj => {
        const ch = chObj.name;
        const item = document.createElement("a");
        item.onclick = () => {
            focusedChannel = focusedChannel === ch && focusLock ? null : ch;
            focusLock = !focusLock;
            drawLines(currentChannels);
        };
        item.textContent = ch;
        item.style.color = color(ch)!;
        item.style.cursor = "pointer";
        item.style.userSelect = "none";
        item.style.marginRight = "1rem";
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
    const allSmoothed = allGrouped.map(s => movingAverage(s, +windowSize));

    const allChecked = selectedChannels.includes("all");
    const selected = selectedChannels.filter(ch => ch !== "all");

    let chosen = [...allSmoothed];
    let totalAllLabeled: MessageData[] = [];
    let selectedTotal: MessageData[] = [];

    if (allChecked) {
        let totalAll = getAggregateTimeSeries(allSmoothed);
        totalAll = movingAverage(totalAll, +windowSize);
        totalAllLabeled = labelSeries(totalAll, "Total", 99999);
        chosen = allSmoothed;
    } else
        chosen = allSmoothed.filter(arr => {
            const ch = arr[0]?.channelName;
            return ch && selected.includes(ch);
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
        .map(arr => arr[0]!)
        .filter(Boolean)
        .sort((a, b) => d3.ascending(a.order, b.order));
    const channelNames = channelObjects.map(d => d.channelName);
    drawLegend(channelNames);

    // Zoom
    zoomBehavior = d3
        .zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([1, 20])
        .translateExtent([
            [margin.left, margin.top],
            [width - margin.right, height - margin.bottom]
        ])
        .on("zoom", event => {
            const transform = event.transform;
            xScale = transform.rescaleX(xOrig);
            yScale = transform.rescaleY(yOrig);
            xScale.domain([
                Math.max(+xOrig.domain()[0]!, +xScale.domain()[0]!),
                Math.min(+xOrig.domain()[1]!, +xScale.domain()[1]!)
            ]);
            drawLines(currentChannels);
        });

    d3
        .select(canvasRef)
        .call(zoomBehavior);
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
        focusedChannel = focusedChannel === closest.channelName && focusLock ? null : closest.channelName;
        focusLock = !focusLock;
        drawLines(currentChannels);
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
        const focusSeries = currentChannels.find(arr => arr[0]?.channelName === focusedChannel);
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
        focusedChannel = closest.channelName;
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
    <input
        id="windowSize"
        type="number"
        min="1"
        bind:value={windowSize}
    />

    <div class="dropdown">
        <button type="button" onclick={toggleChannelMenu}>
            Channels:
        </button>
        {#if channelMenuVisible}
            <div class="dropdown-content">
                <label>
                    <input
                        type="checkbox"
                        value="all"
                        checked={selectedChannels.includes("all")}
                        onchange={(e) => {
                            const checked = (e.target as HTMLInputElement).checked;
                            if (checked)
                                selectedChannels = [...selectedChannels, "all"];
                            else
                                selectedChannels = selectedChannels.filter(ch => ch !== "all");
                        }}
                    />
                    All
                </label>
                {#each allChannelNames as ch}
                    <label>
                        <input
                        type="checkbox"
                        value={ch}
                        checked={selectedChannels.includes(ch)}
                        onchange={(e) => {
                            const checked = (e.target as HTMLInputElement).checked;
                            if (checked)
                                selectedChannels = [...selectedChannels, ch];
                            else
                                selectedChannels = selectedChannels.filter(item => item !== ch);
                        }}
                        />
                        {ch}
                    </label>
                {/each}
            </div>
        {/if}
    </div>
</div>

<div
    id="chart"
    bind:this={chartRef}
>
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
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 0.5rem;
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
    background: rgba(0, 0, 0, 0.8);
    padding: 0.5rem;
    font-size: 0.75rem;
    visibility: hidden;
    z-index: 999;
}

#legend {
    display: flex;
    gap: var(--line-height);
    flex-wrap: wrap;
    margin-bottom: 1rem;
}
</style>
  