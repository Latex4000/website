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

    const canvasScale = 2;
    let canvasSize = 1000;
    let hide = false;
    let loop = false;
    let fftSize = 11; // 2048; // Number of bins in the FFT analysis; Must be a power of 2 between 5 and 15
    let smoothingTimeConstant = 0.85;
    let blockSize = 5; // Size of each block in pixels
    let showLog = false;
    let lowFrequency = 20;
    let highFrequency = 20000;

    let isRecording = false;
    let mediaRecorder: MediaRecorder;
    let recordedChunks: BlobPart[] = [];
    let audioRecorderStream: MediaStreamAudioDestinationNode;

    // D3 Scales
    let frequencyScale: d3.ScaleLinear<number, number>;
    let panningScale: d3.ScaleLinear<number, number>;

    const sanitizeColor = (candidate: string, fallback: string): string =>
        candidate && candidate.trim().length ? candidate.trim() : fallback;

    const parseSequentialRamp = (raw: string) => {
        const byDelimiter = raw
            .split(/[|,]/)
            .map((token) => token.trim())
            .filter(Boolean);
        if (byDelimiter.length) {
            return { values: byDelimiter, hasCustom: true };
        }

        const byWhitespace = raw
            .split(/\s+/)
            .map((token) => token.trim())
            .filter(Boolean);
        if (byWhitespace.length) {
            return { values: byWhitespace, hasCustom: true };
        }

        return { values: [], hasCustom: false };
    };

    const staticGradientPalettes: string[][] = [
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
    ];

    const buildDefaultGradientChoices = (
        background: string,
        text: string,
    ): string[][] => {
        const choices: string[][] = [[background, text]];
        staticGradientPalettes.forEach((palette) => {
            choices.push([background, ...palette]);
        });
        return choices;
    };

    const buildThemeGradientChoices = (
        background: string,
        text: string,
        ramp: string[],
        hasCustom: boolean,
    ): string[][] => {
        if (!hasCustom) return [];
        const normalized = ramp
            .map((color) => sanitizeColor(color, text))
            .filter(Boolean);
        if (!normalized.length) return [];

        const themePalettes: string[][] = [[background, ...normalized]];

        if (normalized.length >= 3)
            themePalettes.push([background, ...[...normalized].reverse()]);

        const evens = normalized.filter((_, index) => index % 2 === 0);
        const odds = normalized.filter((_, index) => index % 2 === 1);
        if (evens.length >= 2) themePalettes.push([background, ...evens]);
        if (odds.length >= 2) themePalettes.push([background, ...odds]);

        return themePalettes;
    };

    const fetchCssContext = () => {
        if (typeof window === "undefined" || !document?.body) {
            return {
                backgroundColor: "#000000",
                textColor: "#ffffff",
                sequentialRamp: [],
                hasCustomRamp: false,
            };
        }

        const style = getComputedStyle(document.body);
        const rawRampValue = style
            .getPropertyValue("--viz-sequential-ramp")
            .trim();
        const { values: sequentialRamp, hasCustom: hasCustomRamp } =
            parseSequentialRamp(rawRampValue);
        return {
            backgroundColor: style
                .getPropertyValue("--background-color")
                .trim(),
            textColor: style.getPropertyValue("--text-color").trim(),
            sequentialRamp,
            hasCustomRamp,
        };
    };

    let { backgroundColor, textColor, sequentialRamp, hasCustomRamp } =
        fetchCssContext();

    let gradientChoice = 1;
    let gradientChoices: string[][] = [];

    let customColorScale = d3
        .scaleLinear<string>()
        .domain([0, 1])
        .range([
            sanitizeColor(backgroundColor, "#000000"),
            sanitizeColor(textColor, "#ffffff"),
        ]);

    const clampGradientChoice = () => {
        if (gradientChoice < 1) gradientChoice = 1;
        if (gradientChoice > gradientChoices.length) {
            gradientChoice = gradientChoices.length;
        }
    };

    const updateColourScale = () => {
        clampGradientChoice();
        const palette = gradientChoices[gradientChoice - 1] ?? [
            sanitizeColor(backgroundColor, "#000000"),
            sanitizeColor(textColor, "#ffffff"),
        ];
        const stops = palette.map((_, index) =>
            palette.length <= 1 ? 0 : index / (palette.length - 1),
        );
        return d3.scaleLinear<string>().domain(stops).range(palette);
    };

    const rebuildGradientChoices = () => {
        const sanitizedBackground = sanitizeColor(backgroundColor, "#000000");
        const sanitizedText = sanitizeColor(textColor, "#ffffff");
        const themePalettes = buildThemeGradientChoices(
            sanitizedBackground,
            sanitizedText,
            sequentialRamp,
            hasCustomRamp,
        );
        const defaults = buildDefaultGradientChoices(
            sanitizedBackground,
            sanitizedText,
        );
        gradientChoices = [...themePalettes, ...defaults];
        if (!gradientChoices.length) {
            gradientChoices = [[sanitizedBackground, sanitizedText]];
        }
        clampGradientChoice();
        customColorScale = updateColourScale();
    };

    rebuildGradientChoices();

    const updateColours = () => {
        ({ backgroundColor, textColor, sequentialRamp, hasCustomRamp } =
            fetchCssContext());
        rebuildGradientChoices();
    };

    function resizeCanvas() {
        const rect = chartRef.getBoundingClientRect();
        const originalBlockCount = Math.floor(canvasSize / blockSize);
        canvasSize = Math.floor(rect.width) * canvasScale;
        canvas.style.width = `${Math.floor(rect.width)}px`;
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        blockSize = Math.min(
            Math.floor(canvasSize / 20),
            Math.max(1, Math.floor(canvasSize / originalBlockCount)),
        );

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
                if (gradientChoices.length) {
                    gradientChoice =
                        (gradientChoice % gradientChoices.length) + 1;
                    customColorScale = updateColourScale();
                }
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
        analyserLeft.smoothingTimeConstant = smoothingTimeConstant;
        analyserRight.smoothingTimeConstant = smoothingTimeConstant;

        const bufferLength = analyserLeft.frequencyBinCount;
        dataArrayLeft = new Uint8Array(bufferLength);
        dataArrayRight = new Uint8Array(bufferLength);

        audioRecorderStream = audioContext.createMediaStreamDestination();

        gainNode.connect(audioContext.destination);
        gainNode.connect(audioRecorderStream);

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

        cancelAnimationFrame(animationId);
        fileName = "";
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        isPlaying = false;
        isPaused = false;
        mouseOnVisualizer = undefined;
    };

    const startRecording = () => {
        // Force the "hide" mode so no overlays are drawn
        hide = true;

        requestAnimationFrame(() => {
            const fps = 60;
            const canvasStream = canvas.captureStream(fps);

            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioRecorderStream.stream.getAudioTracks(),
            ]);

            const mimeTypes = [
                "video/webm; codecs=vp9,opus",
                "video/webm; codecs=vp8,opus",
            ];

            const options: { mimeType?: string } = {};
            for (const mimeType of mimeTypes)
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    options.mimeType = mimeType;
                    break;
                }

            if (!options.mimeType) {
                alert(
                    "No supported MIME type found for recording in your browser",
                );
                console.error("No supported MIME type found for recording");
                return;
            }

            mediaRecorder = new MediaRecorder(combinedStream, options);

            recordedChunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordedChunks.push(e.data);
            };

            // When the audio ends OR the user stops
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "recording.webm";
                a.click();
                URL.revokeObjectURL(url);
            };

            mediaRecorder.start();
            isRecording = true;
        });
    };

    const stopRecording = () => {
        if (isRecording && mediaRecorder?.state === "recording")
            mediaRecorder.stop();
        isRecording = false;
        hide = false;
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
        if (event.key === "z" || event.key === "Z") {
            smoothingTimeConstant = Math.max(0, smoothingTimeConstant - 0.05);
            analyserLeft.smoothingTimeConstant = smoothingTimeConstant;
            analyserRight.smoothingTimeConstant = smoothingTimeConstant;
        }
        if (event.key === "x" || event.key === "X") {
            smoothingTimeConstant = Math.min(1, smoothingTimeConstant + 0.05);
            analyserLeft.smoothingTimeConstant = smoothingTimeConstant;
            analyserRight.smoothingTimeConstant = smoothingTimeConstant;
        }
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
            if (isRecording) {
                stopRecording();
                return;
            }

            if (!isPlaying) return;

            if (isPaused) {
                audioContext.resume();
                isPaused = false;
            } else {
                audioContext.suspend();
                isPaused = true;
            }
        }

        if (event.key === "v" || event.key === "V") {
            if (!isRecording) {
                // If we are playing, stop it first and restart it
                if (isPlaying) stopAudio();

                if (lastFile) playAudio(); // Ensures the audio starts at offset 0
                startRecording();
            } else stopRecording();
        }
    };

    const draw = () => {
        const ctx = canvas.getContext("2d")!;

        const drawFrame = () => {
            updateColours();
            const currenttime = audioContext.currentTime - audioStartTime;
            if (
                parseFloat(audioBuffer.duration.toFixed(3)) <=
                parseFloat(currenttime.toFixed(3))
            ) {
                if (loop) seekAudio(currenttime - audioBuffer.duration);
                else {
                    if (isRecording) stopRecording();
                    stopAudio();
                }
                return;
            }

            analyserLeft.getByteFrequencyData(dataArrayLeft);
            analyserRight.getByteFrequencyData(dataArrayRight);

            // Clear Canvas
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvasSize, canvasSize);

            // Only draw overlays if not hidden AND not in recording mode
            if (!hide && !isRecording) {
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
        ctx.font = `${(parseFloat(getComputedStyle(document.body).fontSize) / 2) * canvasScale}px ${getComputedStyle(document.body).fontFamily}`;
        ctx.textBaseline = "top";
    };

    // Draw audio information on the canvas.
    const drawAudioInformation = (ctx: CanvasRenderingContext2D) => {
        setctxForText(ctx);
        ctx.fillText(
            fileName,
            canvasSize - ctx.measureText(fileName).width,
            2 * canvasScale,
        );
        // Write current time/total time mm:ss/mm:ss
        const currentTime = audioContext.currentTime - audioStartTime;
        const duration = audioBuffer?.duration || 0;
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
            12 * canvasScale,
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
                2 * canvasScale,
            );
            const pan = panningScale.invert(mouseOnVisualizer[0]);
            const panText = (Math.floor(Math.abs(pan) * 100) / 100).toFixed(2);
            ctx.fillText(
                `${panText === (0).toFixed(2) ? "C" : pan.toFixed(2)}`,
                0,
                12 * canvasScale,
            );
        }
    };

    // Draw instructional notes on the canvas.
    const drawInstructionNote = (ctx: CanvasRenderingContext2D) => {
        setctxForText(ctx);
        ctx.fillText("`   | x", 0, canvasSize - 108 * canvasScale);
        ctx.fillText("h   | h", 0, canvasSize - 98 * canvasScale);
        ctx.fillText(
            `l   | ${loop ? "o" : "s"}`,
            0,
            canvasSize - 88 * canvasScale,
        );
        ctx.fillText(`<>  | ${fftSize}`, 0, canvasSize - 78 * canvasScale);
        ctx.fillText(
            `z/x | ${smoothingTimeConstant.toFixed(2)}`,
            0,
            canvasSize - 68 * canvasScale,
        );
        ctx.fillText(`[]  | ${blockSize}`, 0, canvasSize - 58 * canvasScale);
        ctx.fillText(
            `1-${gradientChoices.length} | ${gradientChoice}`,
            0,
            canvasSize - 48 * canvasScale,
        );
        ctx.fillText(
            `+/- | ${gainNode.gain.value.toFixed(2)}`,
            0,
            canvasSize - 38 * canvasScale,
        );
        ctx.fillText(
            `s   | ${showLog ? "lo" : "li"}`,
            0,
            canvasSize - 28 * canvasScale,
        );
        ctx.fillText(
            `?   | ${volumeAffects ? "o" : "s"}`,
            0,
            canvasSize - 18 * canvasScale,
        );
        ctx.fillText(
            `' ' | ${!isPaused ? "o" : "s"}`,
            0,
            canvasSize - 8 * canvasScale,
        );
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
