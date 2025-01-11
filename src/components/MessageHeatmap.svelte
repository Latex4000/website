<script lang="ts">
import { onMount } from "svelte";
import * as d3 from "d3";
import dataFile from "../data/messageData.json";
import { type MessageData } from "../typing/messageData";

let rawData: MessageData[] = dataFile.map((d: any) => ({
    channelName: d.channelName,
    date: new Date(d.date),
    count: +d.count,
    order: +d.order,
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

let heatmapRef: HTMLDivElement;
let canvasRef: HTMLCanvasElement;
let tooltipRef: HTMLDivElement;
let context: CanvasRenderingContext2D | null = null;

let width: number;
let height: number;
const margin = { top: 0, right: 0, bottom: 10, left: 20 };

let groupedDataByYear: {
    [year: number]: {
        [dayOfYear: number]: number;
    };
} = {};

let allYears: number[] = [];

let colorScale: d3.ScaleSequential<string>;

function toggleChannelMenu() {
    channelMenuVisible = !channelMenuVisible;
}

function getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 1);
    const diff = date.getTime() - start.getTime();
    // +1 so that Jan 1 => dayOfYear = 1
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function getFilteredData(): MessageData[] { // If "all" selected, combine everything; otherwise, filter
    if (selectedChannels.includes("all"))
        return rawData;

    const chosen = selectedChannels.filter(ch => ch !== "all");
    return rawData.filter(d => chosen.includes(d.channelName));
}

function prepareData() {
    const filtered = getFilteredData();

    // Group by (year -> dayOfYear), summing counts
    groupedDataByYear = {};
    for (const d of filtered) {
        const y = d.date.getFullYear();
        const day = getDayOfYear(d.date);

        if (!groupedDataByYear[y])
            groupedDataByYear[y] = {};
        if (!groupedDataByYear[y][day])
            groupedDataByYear[y][day] = 0;

        groupedDataByYear[y][day] += d.count;
    }

    allYears = Object.keys(groupedDataByYear)
        .map(y => +y)
        .sort((a, b) => a - b);
}

function drawHeatmap() {
    if (!canvasRef || !heatmapRef) return;

    const rect = heatmapRef.getBoundingClientRect();
    width = rect.width;
    height = Math.floor(width * 1.2);
    console.log(width, height);

    canvasRef.width = width;
    canvasRef.height = height;
    context = canvasRef.getContext("2d")!;
    context.clearRect(0, 0, width, height);
    
    const yearCount = allYears.length;
    if (yearCount === 0) {
        // No data
        context.fillStyle = "#fff";
        context.fillText("No data for selected channels", width / 2, height / 2);
        return;
    }

    const subHeight = (height - margin.top - margin.bottom) / yearCount;
    const subWidth = width - margin.left - margin.right;

    // 53 x 7 grid to encompass all days of the year (some years have 53 partial weeks)
    // Each “row” ~ (height / #years).
    const cellSize = Math.min(subWidth / 53, subHeight / 7);

    let maxCount = 0;
    for (const y of allYears) {
        const dayMap = groupedDataByYear[y]!;
        const localMax = d3.max(Object.values(dayMap)) || 0;
        if (localMax > maxCount) maxCount = localMax;
    }

    colorScale = d3
        .scaleSequential<string>()
        .domain([0, maxCount])
        .interpolator(d3.interpolateInferno);

    allYears.forEach((year, i) => {
        const offsetY = margin.top + i * subHeight;
        const dayMap = groupedDataByYear[year]!;

        // Draw each day cell
        Object.entries(dayMap).forEach(([dayStr, count]) => {
            const dayOfYear = +dayStr;
            const weekIndex = Math.floor((dayOfYear - 1) / 7);
            const dayOfWeek = (dayOfYear - 1) % 7;

            const xPos = margin.left + weekIndex * cellSize;
            const yPos = offsetY + dayOfWeek * cellSize;

            context!.save();
            context!.fillStyle = colorScale(count);
            context!.fillRect(xPos, yPos, cellSize - 1, cellSize - 1);
            context!.restore();
        });

        
        // Draw the label for the year
        context!.save();
        context!.fillStyle = "#fff";
        context!.textAlign = "center";
        context!.textBaseline = "top";
        context!.fillText(`${year}`, margin.left / 2, offsetY);
        context!.restore();
    });
}

function handleMouseMove(e: MouseEvent) {
    if (!context) return;
    if (allYears.length === 0) {
        tooltipRef.style.visibility = "hidden";
        return;
    }

    const rect = canvasRef.getBoundingClientRect();
    const mx = e.clientX - rect.left - margin.left;
    const my = e.clientY - rect.top - margin.top;

    const yearCount = allYears.length;
    const subHeight = (height - margin.top - margin.bottom) / yearCount;
    const yearIndex = Math.floor(my / subHeight);
    if (yearIndex < 0 || yearIndex >= yearCount) {
        tooltipRef.style.visibility = "hidden";
        return;
    }

    const year = allYears[yearIndex]!;
    const offsetY = yearIndex * subHeight;

    const cellSize = Math.min(
        (width - margin.left - margin.right) / 53,
        subHeight / 7
    );

    const localY = my - offsetY; 
    const localX = mx;

    if (localY < 0 || localY > 7 * cellSize) {
        tooltipRef.style.visibility = "hidden";
        return;
    }
    if (localX < 0 || localX > 53 * cellSize) {
        tooltipRef.style.visibility = "hidden";
        return;
    }

    const dayOfWeek = Math.floor(localY / cellSize);
    const weekIndex = Math.floor(localX / cellSize);
    const dayOfYear = weekIndex * 7 + dayOfWeek + 1;
    const date = d3.utcFormat("%b %d %Y")(new Date(year, 0, dayOfYear));
    if (year !== new Date(year, 0, dayOfYear).getFullYear()) {
        tooltipRef.style.visibility = "hidden";
        return;
    }

    const count = groupedDataByYear[year]![dayOfYear] || 0;

    // Position the tooltip
    tooltipRef.style.left = e.clientX + 10 + "px";
    tooltipRef.style.top = e.clientY + 10 + "px";
    tooltipRef.style.visibility = "visible";
    tooltipRef.innerHTML = `
        <div><strong>${year}</strong> - ${date}</div>
        <div>Messages: ${count}</div>
    `;

    // Draw a highlight on the cell and remove it from the previous cell
    const xPos = margin.left + weekIndex * cellSize;
    const yPos = offsetY + dayOfWeek * cellSize;

    context.clearRect(0, 0, width, height);
    drawHeatmap();
    context.save();
    context.strokeStyle = "#fff";
    context.lineWidth = 2;
    context.strokeRect(xPos, yPos, cellSize - 1, cellSize - 1);
    context.restore();

}

function handleMouseLeave() {
    tooltipRef.style.visibility = "hidden";
}

function updateHeatmap() {
    prepareData();
    drawHeatmap();
}

onMount(() => {
    // Get context
    updateHeatmap();
    window.addEventListener("resize", updateHeatmap);
});

// re-runs whenever props change
$effect(() => updateHeatmap());

</script>

<div class="chartOptions">
    <div class="dropdown">
        <button type="button" onclick={toggleChannelMenu}>Channels:</button>
        {#if channelMenuVisible}
            <div class="dropdown-content">
                <label>
                    <input
                        type="checkbox"
                        value="all"
                        checked={selectedChannels.includes("all")}
                        onchange={(e) => {
                            const checked = (e.target as HTMLInputElement).checked;
                            if (checked) {
                                selectedChannels = [...selectedChannels, "all"];
                            } else {
                                selectedChannels = selectedChannels.filter(ch => ch !== "all");
                            }
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
                                    selectedChannels = selectedChannels.filter(c => c !== ch);
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
    id="heatmap"
    bind:this={heatmapRef}
>
    <canvas
        bind:this={canvasRef}
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
    >
        Your browser does not support canvas.
    </canvas>
    <div id="tooltip" bind:this={tooltipRef}></div>
</div>

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

#heatmap {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

#tooltip {
    position: fixed;
    pointer-events: none;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 0.5rem;
    font-size: 0.75rem;
    visibility: hidden;
    z-index: 999;
}
</style>
