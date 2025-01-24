<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { cubicInOut } from 'svelte/easing';
import * as d3 from 'd3';

let chartRef: HTMLDivElement;
let canvas: HTMLCanvasElement;

let fileName: string = "";
let lastFile: File | null = null;

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
let volumeAffects = false;
let mouseOnVisualizer: [number, number] | undefined = undefined;
let fileInput: HTMLInputElement;

let canvasSize: number = 1000;
let fftSize = 11; // 2048; // Number of bins in the FFT analysis; Must be a power of 2 between 5 and 15
let blockSize: number = 5; // Size of each block in pixels

// D3 Scales
let frequencyScale: d3.ScaleLinear<number, number>;
let panningScale: d3.ScaleLinear<number, number>;

let isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
let backgroundColor = isDarkMode ? "#000000" : "#FFFFFF";
let textColor = isDarkMode ? "#FFFFFF" : "#000000";

// Custom Color Scale: Black -> Orange -> White -> Purple
let gradientChoice = 1;
const gradientChoices = [
    [textColor],
    ["#9e0142", "#d53e4f", "#f46d43", "#fdae61", "#fee08b", "#ffffbf", "#e6f598", "#abdda4", "#66c2a5", "#3288bd", "#5e4fa2"],
    ["#2d004b", "#542788", "#8073ac", "#b2abd2", "#d8daeb", "#f7f7f7", "#fee0b6", "#fdb863", "#e08214", "#b35806", "#7f3b08"],
    ["#40004b", "#762a83", "#9970ab", "#c2a5cf", "#e7d4e8", "#f7f7f7", "#d9f0d3", "#a6dba0", "#5aae61", "#1b7837", "#00441b"],
    ["#8e0152", "#c51b7d", "#de77ae", "#f1b6da", "#fde0ef", "#f7f7f7", "#e6f5d0", "#b8e186", "#7fbc41", "#4d9221", "#276419"],
    ["#543005", "#8c510a", "#bf812d", "#dfc27d", "#f6e8c3", "#f5f5f5", "#c7eae5", "#80cdc1", "#35978f", "#01665e", "#003c30"],
    ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac", "#053061"],
].map(g => [backgroundColor, ...g]); // All gradients start with black and then go to the specified colors
let customColorScale = d3.scaleLinear<string>()
    .domain(gradientChoices[gradientChoice - 1]!.map((_, i) => i / (gradientChoices[gradientChoice - 1]!.length - 1)))
    .range(gradientChoices[gradientChoice - 1]!);

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
    // A touch event anywhere outside the canvas changes gradient
    window.addEventListener('touchstart', (event) => {
        if (!canvas.contains(event.target as Node)) {
            gradientChoice = (gradientChoice + 1) % gradientChoices.length;
            customColorScale = d3.scaleLinear<string>()
                .domain(gradientChoices[gradientChoice - 1]!.map((_, i) => i / (gradientChoices[gradientChoice - 1]!.length - 1)))
                .range(gradientChoices[gradientChoice - 1]!);
        }
    });
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create GainNode to control volume
    gainNode = audioContext.createGain();
    gainNode.gain.value = 1;

    // Create separate AnalyserNodes for left and right channels
    analyserLeft = audioContext.createAnalyser();
    analyserRight = audioContext.createAnalyser();
    analyserLeft.fftSize = 2 ** fftSize;
    analyserRight.fftSize = 2 ** fftSize;

    const bufferLength = analyserLeft.frequencyBinCount;
    dataArrayLeft = new Uint8Array(bufferLength);
    dataArrayRight = new Uint8Array(bufferLength);

    // Event listener for ESC key to stop playback
    window.addEventListener('keydown', handleKeyDown);

    // Add drag and drop event listeners
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
});

const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
};

const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
        const file = files[0]!;
        if (lastFile && file.name === lastFile.name && file.size === lastFile.size && file.lastModified === lastFile.lastModified) {
            // Same file dropped, replay from the beginning
            if (isPlaying) {
                stopAudio();
                playAudio();
            }
        } else {
            // Different file, handle as new upload
            lastFile = file;
            handleFile(file);
        }
    }
};

const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (file) {
        target.value = "";
        lastFile = file;
        handleFile(file);
    }
};

const handleFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    if (isPlaying)
        stopAudio();

    fileName = file.name;
    playAudio();
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
    fileName = "";
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    isPlaying = false;
    isPaused = false;
    mouseOnVisualizer = undefined;
};

const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.key === '`' || event.key === '~' || event.key === 'Escape') && isPlaying)
        stopAudio();
    if ((event.key === ']' || event.key === '}') && blockSize < canvasSize / 20)
        blockSize++;
    if ((event.key === '[' || event.key === '{') && blockSize > 1)
        blockSize--;
    if ((event.key === '+' || event.key === '=') && gainNode.gain.value < 2)
        gainNode.gain.value = Math.min(gainNode.gain.value + 0.05, 2);
    if ((event.key === '-' || event.key === '_') && gainNode.gain.value > 0)
        gainNode.gain.value = Math.max(gainNode.gain.value - 0.05, 0);
    if (event.key === "?" || event.key === "/")
        volumeAffects = !volumeAffects;
    if (!isNaN(parseInt(event.key)) && parseInt(event.key) > 0 && parseInt(event.key) <= gradientChoices.length) {
        gradientChoice = parseInt(event.key);
        customColorScale = d3.scaleLinear<string>()
            .domain(gradientChoices[gradientChoice - 1]!.map((_, i) => i / (gradientChoices[gradientChoice - 1]!.length - 1)))
            .range(gradientChoices[gradientChoice - 1]!);
    }
    if ((event.key === "<" || event.key === ",") && fftSize > 5) {
        fftSize--;
        analyserLeft.fftSize = 2 ** fftSize;
        analyserRight.fftSize = 2 ** fftSize;
        const bufferLength = analyserLeft.frequencyBinCount;
        dataArrayLeft = new Uint8Array(bufferLength);
        dataArrayRight = new Uint8Array(bufferLength);
    }
    if ((event.key === ">" || event.key === ".") && fftSize < 15) {
        fftSize++;
        analyserLeft.fftSize = 2 ** fftSize;
        analyserRight.fftSize = 2 ** fftSize;
        const bufferLength = analyserLeft.frequencyBinCount;
        dataArrayLeft = new Uint8Array(bufferLength);
        dataArrayRight = new Uint8Array(bufferLength);
    }

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
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        drawMouseInformation(ctx);

        const bufferLength = analyserLeft.frequencyBinCount;
        for (let i = 0; i < bufferLength; i++) {
            const amplitudeLeft = dataArrayLeft[i]! / 255;
            const amplitudeRight = dataArrayRight[i]! / 255;

            const amplitude = (amplitudeLeft + amplitudeRight) / 2 * (volumeAffects ? gainNode.gain.value : 1);
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

// Draw mouse position information on the canvas.
const drawMouseInformation = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.font = "10px JetBrains Mono";
    ctx.textBaseline = "top";
    ctx.fillText(fileName, canvasSize - ctx.measureText(fileName).width, 0);
    if (mouseOnVisualizer) {
        ctx.fillText(frequencyScale.invert(canvasSize - mouseOnVisualizer[1]).toFixed(0), 0, 0);
        const pan = panningScale.invert(mouseOnVisualizer[0]);
        const panText = (Math.floor(Math.abs(pan) * 100) / 100).toFixed(2);
        ctx.fillText(`${panText === (0).toFixed(2) ? "C" : pan.toFixed(2)}`, 0, 12);
    }
};

// Draw instructional notes on the canvas.
const drawInstructionNote = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.font = "10px JetBrains Mono";
    ctx.textBaseline = "top";
    ctx.fillText("`   | x", 0, canvasSize - 82);
    ctx.fillText(`<>  | ${fftSize}`, 0, canvasSize - 70);
    ctx.fillText(`[]  | ${blockSize}`, 0, canvasSize - 58);
    ctx.fillText(`1-${gradientChoices.length} | ${gradientChoice}`, 0, canvasSize - 46);
    ctx.fillText(`+/- | ${gainNode.gain.value.toFixed(2)}`, 0, canvasSize - 34);
    ctx.fillText(`?   | ${volumeAffects ? "o" : "s"}`, 0, canvasSize - 22);
    ctx.fillText(`' ' | ${!isPaused ? "o" : "s"}`, 0, canvasSize - 10);
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
    ctx.fillStyle = textColor;

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

const onCanvasMouseMove = (event: MouseEvent | TouchEvent) => {
    if (isPlaying) // Canvas top is 0, bottom is canvasSize
        mouseOnVisualizer = [
            (event instanceof MouseEvent ? event.clientX : event.touches[0]!.clientX) - canvas.getBoundingClientRect().left, 
            (event instanceof MouseEvent ? event.clientY : event.touches[0]!.clientY) - canvas.getBoundingClientRect().top
        ]

    if (isPlaying || target === 1)
        return;

    target = 1;
    startTime = 0;
    animationId = requestAnimationFrame(mouseAnimation);
};

const onCanvasMouseLeave = () => {
    mouseOnVisualizer = undefined;

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
