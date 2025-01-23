<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { cubicInOut } from 'svelte/easing';
import * as d3 from 'd3';

let chartRef: HTMLDivElement;
let canvas: HTMLCanvasElement;

let audioContext: AudioContext;
let audioBuffer: AudioBuffer;
let sourceNode: AudioBufferSourceNode;
let analyserLeft: AnalyserNode;
let analyserRight: AnalyserNode;
let gainNode: GainNode;

let dataArrayLeft: Uint8Array;
let dataArrayRight: Uint8Array;

let animationId: number;
let isPlaying = false;
let isPaused = false;
let fileInput: HTMLInputElement;

let canvasSize: number = 1000;
let blockSize: number = 5; // Size of each block in pixels

// D3 Scales
let frequencyScale: d3.ScaleLinear<number, number>;
let panningScale: d3.ScaleLinear<number, number>;

// Custom Color Scale: Black -> Orange -> White -> Purple
const customColorScale = d3.scaleLinear<string>([
    "#000000",
    "#FF4500",
    "#FFFFFF",
    "#800080"
]);

function resizeCanvas() {
    const rect = chartRef.getBoundingClientRect();
    const originalBlockCount = Math.floor(canvasSize / blockSize);
    canvasSize = Math.floor(rect.width);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    blockSize = Math.floor(canvasSize / originalBlockCount);

    // Update scales based on new canvas size
    frequencyScale = d3.scaleLinear()
        .domain([20, 20000])
        .range([0, canvasSize - blockSize]);

    panningScale = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, canvasSize - blockSize]);
}

onMount(() => {
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create GainNode to control volume
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1;

    // Create separate AnalyserNodes for left and right channels
    analyserLeft = audioContext.createAnalyser();
    analyserRight = audioContext.createAnalyser();
    analyserLeft.fftSize = 2048;
    analyserRight.fftSize = 2048;

    const bufferLength = analyserLeft.frequencyBinCount;
    dataArrayLeft = new Uint8Array(bufferLength);
    dataArrayRight = new Uint8Array(bufferLength);

    // Event listener for ESC key to stop playback
    window.addEventListener('keydown', handleKeyDown);
});

const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (file) {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        if (isPlaying)
            stopAudio();

        playAudio();
    }
};

const playAudio = () => {
    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;

    // Create a channel splitter to separate left and right channels
    const splitter = audioContext.createChannelSplitter(2);
    sourceNode.connect(splitter);

    // Connect splitter outputs to respective AnalyserNodes
    splitter.connect(analyserLeft, 0);
    splitter.connect(analyserRight, 1);

    // Connect GainNode to sourceNode
    sourceNode.connect(gainNode);
    gainNode.connect(audioContext.destination);

    sourceNode.start();
    isPlaying = true;
    target = 0;
    draw();
};

const stopAudio = () => {
    if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
    }

    if (gainNode) gainNode.disconnect();
    if (analyserLeft) analyserLeft.disconnect();
    if (analyserRight) analyserRight.disconnect();

    cancelAnimationFrame(animationId);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    isPlaying = false;
    isPaused = false;
};

const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.key === '`' || event.key === '~') && isPlaying)
        stopAudio();
    if ((event.key === ']' || event.key === '}') && blockSize < canvasSize / 20)
        blockSize++;
    if ((event.key === '[' || event.key === '{') && blockSize > 1)
        blockSize--;
    if ((event.key === '+' || event.key === '=') && gainNode.gain.value < 2)
        gainNode.gain.value = Math.min(gainNode.gain.value + 0.1, 2);
    if ((event.key === '-' || event.key === '_') && gainNode.gain.value > 0)
        gainNode.gain.value = Math.max(gainNode.gain.value - 0.1, 0);

    if (event.code === "Space") {
        event.preventDefault();
        if (!isPlaying)
            return;

        if (isPaused) {
            audioContext.resume();
            isPaused = false;
        } else {
            audioContext.suspend();
            isPaused = true;
        }
    }
};

const draw = () => {
    const ctx = canvas.getContext('2d')!;

    const drawFrame = () => {
        analyserLeft.getByteFrequencyData(dataArrayLeft);
        analyserRight.getByteFrequencyData(dataArrayRight);

        // Clear Canvas
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        const bufferLength = analyserLeft.frequencyBinCount;

        for (let i = 0; i < bufferLength; i++) {
            const amplitudeLeft = dataArrayLeft[i]! / 255;
            const amplitudeRight = dataArrayRight[i]! / 255;

            const amplitude = (amplitudeLeft + amplitudeRight) / 2;
            const frequency = i * audioContext.sampleRate / analyserLeft.fftSize;

            // Map frequency to Y position
            const y = canvasSize - frequencyScale(frequency) - blockSize;

            // Map panning to X position
            const pan = (amplitudeRight - amplitudeLeft) / (amplitudeLeft + amplitudeRight + 1e-6); // Range [-1, 1]
            const x = panningScale(pan);

            // Get color based on amplitude
            const color = customColorScale(amplitude);

            ctx.fillStyle = color;
            ctx.fillRect(x, y, blockSize, blockSize);
        }

        drawInstructionNote(ctx);

        animationId = requestAnimationFrame(drawFrame);
    };

    drawFrame();
};

// Draw instructional notes on the canvas.
const drawInstructionNote = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.font = "10px JetBrains Mono";
    ctx.textBaseline = "top";
    ctx.fillText("` | x", 2, canvasSize - 12);
    ctx.fillText("[] | s", 2, canvasSize - 24);
    ctx.fillText("+/- | v", 2, canvasSize - 36);
    ctx.fillText("' ' | p", 2, canvasSize - 48);
};

const handleCanvasClick = () => fileInput.click();

let progress = 0;
let target = 0;
let startTime: number;
const duration = 500; // ms
const mouseAnimation = (timestamp: number) => {
    if (!startTime)
        startTime = timestamp;

    const elapsed = timestamp - startTime;
    let t = Math.min(elapsed / duration, 1);

    // Apply easing
    const easedT = cubicInOut(t);

    // Update progress towards target
    if (target === 1)
        progress = easedT;
    else
        progress = 1 - easedT;

    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw the white square based on progress
    ctx.fillStyle = "#FFFFFF";

    // Calculate size based on progress (from 0 to full size)
    const size = progress * Math.min(width, height);
    const x = (width - size) / 2;
    const y = (height - size) / 2;
    ctx.fillRect(x, y, size, size);
        
    if (t < 1)
        animationId = requestAnimationFrame(mouseAnimation);
    else
        progress = target;
};

const onCanvasMouseMove = () => {
    if (isPlaying || target === 1)
        return;

    target = 1;
    startTime = 0;
    animationId = requestAnimationFrame(mouseAnimation);
};

const onCanvasMouseLeave = () => {
    if (isPlaying || target === 0)
        return;

    target = 0;
    startTime = 0;
    animationId = requestAnimationFrame(mouseAnimation);
};

onDestroy(() => {
    stopAudio();

    if (audioContext)
        audioContext.close();

    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("keydown", handleKeyDown);
});
</script>

<style>
.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--line-height);
}

canvas {
    margin-top: var(--line-height);
    cursor: pointer;
}
</style>

<div
    class="container"
    bind:this={chartRef}
>
    <input
        type="file"
        accept="audio/*"
        bind:this={fileInput}
        onchange={handleFileUpload}
        style="display: none;"
    />
    <canvas
        bind:this={canvas}
        onmousemove={onCanvasMouseMove}
        onmouseleave={onCanvasMouseLeave}
        ontouchmove={onCanvasMouseMove}
        ontouchend={onCanvasMouseLeave}
        ontouchcancel={onCanvasMouseLeave}
        onclick={handleCanvasClick}
    ></canvas>
</div>
