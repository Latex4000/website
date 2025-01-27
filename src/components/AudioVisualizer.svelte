<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { cubicInOut } from "svelte/easing";
    import * as d3 from "d3";

    let chartRef: HTMLDivElement;
    let canvas: HTMLCanvasElement;

    let fileName: string = "";
    let lastFile: File | null = null;
    let audioStartTime = 0;

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

    let canvasSize = 1000;
    let hide = false;
    let loop = false;
    let fftSize = 11; // 2048; // Number of bins in the FFT analysis; Must be a power of 2 between 5 and 15
    let blockSize = 5; // Size of each block in pixels
    let showLog = false;
    let lowFrequency = 20;
    let highFrequency = 20000;

    // D3 Scales
    let frequencyScale: d3.ScaleLinear<number, number>;
    let panningScale: d3.ScaleLinear<number, number>;

    const fetchCSSColors = () => {
        const backgroundColor = getComputedStyle(
            document.body,
        ).getPropertyValue("--background-color");
        const textColor = getComputedStyle(document.body).getPropertyValue(
            "--text-color",
        );
        return { backgroundColor, textColor };
    };
    let { backgroundColor, textColor } = fetchCSSColors();
    // Custom Color Scale: Black -> Orange -> White -> Purple
    let gradientChoice = 1;
    const gradientChoices = [
        [textColor],
        [
            "#9e0142",
            "#d53e4f",
            "#f46d43",
            "#fdae61",
            "#fee08b",
            "#ffffbf",
            "#e6f598",
            "#abdda4",
            "#66c2a5",
            "#3288bd",
            "#5e4fa2",
        ],
        [
            "#2d004b",
            "#542788",
            "#8073ac",
            "#b2abd2",
            "#d8daeb",
            "#f7f7f7",
            "#fee0b6",
            "#fdb863",
            "#e08214",
            "#b35806",
            "#7f3b08",
        ],
        [
            "#40004b",
            "#762a83",
            "#9970ab",
            "#c2a5cf",
            "#e7d4e8",
            "#f7f7f7",
            "#d9f0d3",
            "#a6dba0",
            "#5aae61",
            "#1b7837",
            "#00441b",
        ],
        [
            "#8e0152",
            "#c51b7d",
            "#de77ae",
            "#f1b6da",
            "#fde0ef",
            "#f7f7f7",
            "#e6f5d0",
            "#b8e186",
            "#7fbc41",
            "#4d9221",
            "#276419",
        ],
        [
            "#543005",
            "#8c510a",
            "#bf812d",
            "#dfc27d",
            "#f6e8c3",
            "#f5f5f5",
            "#c7eae5",
            "#80cdc1",
            "#35978f",
            "#01665e",
            "#003c30",
        ],
        [
            "#67001f",
            "#b2182b",
            "#d6604d",
            "#f4a582",
            "#fddbc7",
            "#f7f7f7",
            "#d1e5f0",
            "#92c5de",
            "#4393c3",
            "#2166ac",
            "#053061",
        ],
    ].map((g) => [backgroundColor, ...g]); // All gradients start with black and then go to the specified colors
    const updateColourScale = () => {
        return d3
            .scaleLinear<string>()
            .domain(
                gradientChoices[gradientChoice - 1]!.map(
                    (_, i) =>
                        i / (gradientChoices[gradientChoice - 1]!.length - 1),
                ),
            )
            .range(gradientChoices[gradientChoice - 1]!);
    };
    let customColorScale = updateColourScale();

    const updateColours = () => {
        ({ backgroundColor, textColor } = fetchCSSColors());
        gradientChoices[0] = [backgroundColor, textColor];
        gradientChoices.forEach((g) => (g[0] = backgroundColor));
        customColorScale = updateColourScale();
    };

    function resizeCanvas() {
        const rect = chartRef.getBoundingClientRect();
        const originalBlockCount = Math.floor(canvasSize / blockSize);
        canvasSize = Math.floor(rect.width);
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        blockSize = Math.floor(canvasSize / originalBlockCount);

        // Update scales based on new canvas size
        frequencyScale = showLog
            ? d3
                  .scaleLog()
                  .domain([lowFrequency, highFrequency])
                  .range([0, canvasSize - blockSize])
            : d3
                  .scaleLinear()
                  .domain([lowFrequency, highFrequency])
                  .range([0, canvasSize - blockSize]);

        panningScale = d3
            .scaleLinear()
            .domain([-1, 1])
            .range([0, canvasSize - blockSize]);
    }

    onMount(() => {
        // A touch event anywhere outside the canvas changes gradient
        window.addEventListener("touchstart", (event) => {
            if (!canvas.contains(event.target as Node)) {
                gradientChoice = (gradientChoice + 1) % gradientChoices.length;
                customColorScale = updateColourScale();
            }
        });
        window.addEventListener("resize", resizeCanvas);
        const chartRefObserver = new ResizeObserver(() => {
            resizeCanvas();
        });
        chartRefObserver.observe(chartRef);
        resizeCanvas();

        audioContext = new (window.AudioContext ||
            (window as any).webkitAudioContext)();

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
        window.addEventListener("keydown", handleKeyDown);

        // Add drag and drop event listeners
        canvas.addEventListener("dragover", handleDragOver);
        canvas.addEventListener("drop", handleDrop);
    });

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        event.dataTransfer!.dropEffect = "copy";
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0]!;
            if (
                lastFile &&
                file.name === lastFile.name &&
                file.size === lastFile.size &&
                file.lastModified === lastFile.lastModified
            ) {
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

        if (isPlaying) stopAudio();

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
        audioContext.resume();
        isPaused = false;
        isPlaying = true;
        target = 0;
        audioStartTime = audioContext.currentTime;
        draw();
    };

    const seekAudio = (offsetSeconds: number) => {
        if (isPlaying) {
            sourceNode.stop();
            sourceNode.disconnect();
        }

        // Clamp out of bounds offset
        offsetSeconds = Math.min(
            Math.max(offsetSeconds, 0),
            audioBuffer.duration,
        );

        // Create new source, channel splitter, connect to analyzers, gain, etc.
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;

        const splitter = audioContext.createChannelSplitter(2);
        sourceNode.connect(splitter);
        splitter.connect(analyserLeft, 0);
        splitter.connect(analyserRight, 1);

        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Start it at offsetSeconds
        sourceNode.start(0, offsetSeconds);

        // For normal audioStartTime in playAudio: currentTime = audioContext.currentTime - audioStartTime
        // Then for seeking we want: audioStartTime = audioContext.currentTime - offsetSeconds
        audioStartTime = audioContext.currentTime - offsetSeconds;

        cancelAnimationFrame(animationId);
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
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        isPlaying = false;
        isPaused = false;
        mouseOnVisualizer = undefined;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "s") {
            showLog = !showLog;
            frequencyScale = showLog
                ? d3
                      .scaleLog()
                      .domain([lowFrequency, highFrequency])
                      .range([0, canvasSize - blockSize])
                : d3
                      .scaleLinear()
                      .domain([lowFrequency, highFrequency])
                      .range([0, canvasSize - blockSize]);
        }
        if (event.key === "h") hide = !hide;
        if (event.key === "l") loop = !loop;
        if (
            (event.key === "`" ||
                event.key === "~" ||
                event.key === "Escape") &&
            isPlaying
        )
            stopAudio();
        if (
            (event.key === "]" || event.key === "}") &&
            blockSize < canvasSize / 20
        )
            blockSize++;
        if ((event.key === "[" || event.key === "{") && blockSize > 1)
            blockSize--;
        if ((event.key === "+" || event.key === "=") && gainNode.gain.value < 2)
            gainNode.gain.value = Math.min(gainNode.gain.value + 0.05, 2);
        if ((event.key === "-" || event.key === "_") && gainNode.gain.value > 0)
            gainNode.gain.value = Math.max(gainNode.gain.value - 0.05, 0);
        if (event.key === "?" || event.key === "/")
            volumeAffects = !volumeAffects;
        if (
            !isNaN(parseInt(event.key)) &&
            parseInt(event.key) > 0 &&
            parseInt(event.key) <= gradientChoices.length
        ) {
            gradientChoice = parseInt(event.key);
            customColorScale = updateColourScale();
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
        // if left/right key pressed, seek 5 seconds back/forward
        if (event.key === "ArrowLeft")
            seekAudio(audioContext.currentTime - audioStartTime - 5);
        if (event.key === "ArrowRight")
            seekAudio(audioContext.currentTime - audioStartTime + 5);

        if (event.code === "Space") {
            event.preventDefault();
            if (!isPlaying) return;

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
        const ctx = canvas.getContext("2d")!;

        const drawFrame = () => {
            updateColours();
            if (
                parseFloat(audioBuffer.duration.toFixed(3)) <=
                parseFloat(
                    (audioContext.currentTime - audioStartTime).toFixed(3),
                )
            ) {
                if (loop)
                    seekAudio(
                        audioContext.currentTime -
                            audioStartTime -
                            audioBuffer.duration,
                    );
                else stopAudio();
                return;
            }

            analyserLeft.getByteFrequencyData(dataArrayLeft);
            analyserRight.getByteFrequencyData(dataArrayRight);

            // Clear Canvas
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvasSize, canvasSize);

            if (!hide) {
                drawAudioInformation(ctx);
                drawMouseInformation(ctx);
            }

            const bufferLength = analyserLeft.frequencyBinCount;
            for (let i = 0; i < bufferLength; i++) {
                const amplitudeLeft = dataArrayLeft[i]! / 255;
                const amplitudeRight = dataArrayRight[i]! / 255;

                const amplitude =
                    ((amplitudeLeft + amplitudeRight) / 2) *
                    (volumeAffects ? gainNode.gain.value : 1);
                const frequency =
                    (i * audioContext.sampleRate) / analyserLeft.fftSize;

                // Map frequency to Y position
                const y = canvasSize - frequencyScale(frequency) - blockSize;

                // Map panning to X position (also check if mono too, in which case pan = 0)
                const pan =
                    audioBuffer.numberOfChannels === 1
                        ? 0
                        : (amplitudeRight - amplitudeLeft) /
                          (amplitudeLeft + amplitudeRight + 1e-6); // Range [-1, 1]
                const x = panningScale(pan);

                // Get color based on amplitude
                const color = customColorScale(amplitude);

                ctx.fillStyle = color;
                ctx.fillRect(x, y, blockSize, blockSize);
            }

            if (!hide) drawInstructionNote(ctx);

            animationId = requestAnimationFrame(drawFrame);
        };

        drawFrame();
    };

    const setctxForText = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = textColor;
        ctx.textAlign = "left";
        ctx.font = `${parseFloat(getComputedStyle(document.body).fontSize) / 2}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textBaseline = "top";
    };

    // Draw audio information on the canvas.
    const drawAudioInformation = (ctx: CanvasRenderingContext2D) => {
        setctxForText(ctx);
        ctx.fillText(fileName, canvasSize - ctx.measureText(fileName).width, 2);
        // Write current time/total time mm:ss/mm:ss
        const currentTime = audioContext.currentTime - audioStartTime;
        const duration = audioBuffer.duration;
        const currentMinutes = Math.floor(currentTime / 60);
        const currentSeconds = Math.floor(currentTime % 60);
        const totalMinutes = Math.floor(duration / 60);
        const totalSeconds = Math.floor(duration % 60);
        ctx.fillText(
            `${currentMinutes}:${currentSeconds
                .toString()
                .padStart(2, "0")}/${totalMinutes}:${totalSeconds
                .toString()
                .padStart(2, "0")}`,
            canvasSize - ctx.measureText("0:00/0:00").width,
            12,
        );
    };

    // Draw mouse position information on the canvas.
    const drawMouseInformation = (ctx: CanvasRenderingContext2D) => {
        setctxForText(ctx);
        if (mouseOnVisualizer) {
            ctx.fillText(
                frequencyScale
                    .invert(canvasSize - mouseOnVisualizer[1])
                    .toFixed(0),
                0,
                2,
            );
            const pan = panningScale.invert(mouseOnVisualizer[0]);
            const panText = (Math.floor(Math.abs(pan) * 100) / 100).toFixed(2);
            ctx.fillText(
                `${panText === (0).toFixed(2) ? "C" : pan.toFixed(2)}`,
                0,
                12,
            );
        }
    };

    // Draw instructional notes on the canvas.
    const drawInstructionNote = (ctx: CanvasRenderingContext2D) => {
        setctxForText(ctx);
        ctx.fillText("`   | x", 0, canvasSize - 98);
        ctx.fillText("h   | h", 0, canvasSize - 88);
        ctx.fillText(`l   | ${loop ? "o" : "s"}`, 0, canvasSize - 78);
        ctx.fillText(`<>  | ${fftSize}`, 0, canvasSize - 68);
        ctx.fillText(`[]  | ${blockSize}`, 0, canvasSize - 58);
        ctx.fillText(
            `1-${gradientChoices.length} | ${gradientChoice}`,
            0,
            canvasSize - 48,
        );
        ctx.fillText(
            `+/- | ${gainNode.gain.value.toFixed(2)}`,
            0,
            canvasSize - 38,
        );
        ctx.fillText(`s   | ${showLog ? "lo" : "li"}`, 0, canvasSize - 28);
        ctx.fillText(`?   | ${volumeAffects ? "o" : "s"}`, 0, canvasSize - 18);
        ctx.fillText(`' ' | ${!isPaused ? "o" : "s"}`, 0, canvasSize - 8);
    };

    const handleCanvasClick = () => fileInput.click();

    const handleSeekClick = (event: MouseEvent) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const fraction = Math.min(Math.max(x / canvasSize, 0), 1);
        seekAudio(fraction * audioBuffer.duration);
    };

    const handleScroll = (event: WheelEvent) => {
        event.preventDefault();

        // If ctrl is pressed, zoom in/out on frequency
        if (event.ctrlKey && mouseOnVisualizer) {
            const delta = event.deltaY > 0 ? 1 : -1;
            const bottomDistFromCentre = canvasSize - mouseOnVisualizer[1];
            const topDistFromCentre = mouseOnVisualizer[1];

            // If they are scrolling from the top/bottom edges, only the opposite scale should change, if they are scrolling from the middle, both should change equally
            const topScaleFactor = -(
                1 +
                delta * (topDistFromCentre / canvasSize)
            );
            const bottomScaleFactor =
                1 + delta * (bottomDistFromCentre / canvasSize);
            console.log(topScaleFactor, bottomScaleFactor);
            lowFrequency = Math.min(
                highFrequency,
                Math.max(20, lowFrequency * topScaleFactor),
            );
            highFrequency = Math.max(
                lowFrequency,
                Math.min(20000, highFrequency * bottomScaleFactor),
            );

            frequencyScale = showLog
                ? d3
                      .scaleLog()
                      .domain([lowFrequency, highFrequency])
                      .range([0, canvasSize - blockSize])
                : d3
                      .scaleLinear()
                      .domain([lowFrequency, highFrequency])
                      .range([0, canvasSize - blockSize]);
            return;
        }

        // If alt key then change volume
        if (event.altKey) {
            if (event.deltaY < 0 && blockSize < canvasSize / 20) blockSize++;
            if (event.deltaY > 0 && blockSize > 1) blockSize--;
            return;
        }

        if (event.deltaY < 0 && gainNode.gain.value < 2)
            gainNode.gain.value = Math.min(gainNode.gain.value + 0.05, 2);
        if (event.deltaY > 0 && gainNode.gain.value > 0)
            gainNode.gain.value = Math.max(gainNode.gain.value - 0.05, 0);
    };

    let progress = 0;
    let target = 0;
    let startTime: number;
    const duration = 500; // ms
    const mouseAnimation = (timestamp: number) => {
        updateColours();
        if (!startTime) startTime = timestamp;

        const elapsed = timestamp - startTime;
        let t = Math.min(elapsed / duration, 1);

        // Apply easing
        const easedT = cubicInOut(t);

        // Update progress towards target
        if (target === 1) progress = easedT;
        else progress = 1 - easedT;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
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

        if (t < 1) animationId = requestAnimationFrame(mouseAnimation);
        else progress = target;
    };

    const onCanvasMouseMove = (event: MouseEvent | TouchEvent) => {
        if (isPlaying)
            // Canvas top is 0, bottom is canvasSize
            mouseOnVisualizer = [
                (event instanceof MouseEvent
                    ? event.clientX
                    : event.touches[0]!.clientX) -
                    canvas.getBoundingClientRect().left,
                (event instanceof MouseEvent
                    ? event.clientY
                    : event.touches[0]!.clientY) -
                    canvas.getBoundingClientRect().top,
            ];

        if (isPlaying || target === 1) return;

        target = 1;
        startTime = 0;
        animationId = requestAnimationFrame(mouseAnimation);
    };

    const onCanvasMouseLeave = () => {
        mouseOnVisualizer = undefined;

        if (isPlaying || target === 0) return;

        target = 0;
        startTime = 0;
        animationId = requestAnimationFrame(mouseAnimation);
    };

    onDestroy(() => {
        stopAudio();

        if (audioContext) audioContext.close();

        window.removeEventListener("resize", resizeCanvas);
        window.removeEventListener("keydown", handleKeyDown);
    });
</script>

<div class="container" bind:this={chartRef}>
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
        oncontextmenu={(e) => e.preventDefault()}
        onauxclick={handleSeekClick}
        onwheel={handleScroll}
    ></canvas>
</div>

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
