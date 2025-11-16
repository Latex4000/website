import "./AudioPlayer.css";
import { useCallback, useEffect, useRef, useState, type MouseEventHandler } from "react";

function formatTimestamp(seconds?: number): string {
	if (seconds == null) {
		return "--:--";
	}

	return (
		Math.floor(seconds / 60).toString(10).padStart(2, "0") +
		":" +
		Math.floor(seconds % 60).toString(10).padStart(2, "0")
	);
}

function sanitizeFilename(filename: string): string {
	return filename.replaceAll(/[^a-z0-9\.()\[\] _-]+/gi, "_");
}

function timestampHtml(currentTime: number, duration: number | undefined): string {
	const resolvedDuration = duration != null && Number.isFinite(duration) ? duration : undefined;
	const resolvedCurrentTime = resolvedDuration != null && Number.isFinite(currentTime) ? currentTime : undefined;

	return (
		`<span>${formatTimestamp(resolvedCurrentTime)}</span>` +
		"/" +
		`<span>${formatTimestamp(resolvedDuration)}</span>`
	);
}

interface AudioPlayerProps {
	coverUrl: string;
	durationGuess?: number;
	id: number;
	src: string;
	title: string;
	trackType: string;
}

export function AudioPlayer({ coverUrl, durationGuess, id, src, title, trackType }: AudioPlayerProps) {
	// const onBookmarkClick: MouseEventHandler<HTMLButtonElement> = (event) => {
	// 	event.preventDefault();

	// 	// TODO
	// };

	const onDownloadClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();

		const downloadLink = document.createElement("a");
		downloadLink.href = src;
		downloadLink.download = sanitizeFilename(`${title}.${trackType}`);
		document.body.appendChild(downloadLink);
		downloadLink.click();
		downloadLink.remove();
	};

	return (
		<div
			className="audio-player js-audio-player"
			data-audio-cover-url={coverUrl}
			data-audio-id={id}
			data-audio-src={src}
			data-audio-title={title}
			style={{ "--duration": durationGuess }}
		>
			<button className="audio-player-play js-audio-player-play" aria-label="Play sound">{"|>"}</button>
			<div className="audio-player-bar js-audio-player-bar">
				{/* <div className="audio-player-bar-fill audio-player-bar-fill-buffered" /> */}
				<div className="audio-player-bar-fill audio-player-bar-fill-current-time" />
				<div
					className="audio-player-timestamps js-audio-player-timestamps"
					dangerouslySetInnerHTML={{ __html: timestampHtml(0, durationGuess) }}
				/>
			</div>
			{/* <button onClick={onBookmarkClick} className="audio-player-bookmark">*</button> */}
			<button onClick={onDownloadClick} className="audio-player-download" aria-label="Download sound">↓</button>
		</div>
	);
}

let renderedMasterAudioPlayer = false;

export function MasterAudioPlayer() {
	useEffect(() => {
		if (renderedMasterAudioPlayer) {
			throw new Error("Tried to render more than one MasterAudioPlayer");
		}

		renderedMasterAudioPlayer = true;
	}, []);

	// const [buffered, setBuffered] = useState(0);
	const [coverUrl, setCoverUrl] = useState<string>();
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState<number | undefined>();
	const [id, setId] = useState<number>();
	const [muted, setMuted] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [shuffle, setShuffle] = useState(false);
	const [title, setTitle] = useState("<no sound playing>");
	const [volume, setVolume] = useState(0.35);
	const playHistoryRef = useRef<HTMLDivElement[]>([]);
	const historyIndexRef = useRef(-1);

	const allPlayers = useRef<HTMLDivElement[]>([]);
	const currentPlayer = useRef<HTMLDivElement>(null);
	const audio = useRef(new Audio());
	const volumeRef = useRef<HTMLDivElement>(null);

	const syncPlayer = useCallback(() => {
		if (currentPlayer.current == null) {
			return;
		}

		// const buffered =
		const currentTime = audio.current.currentTime;
		let duration: number | undefined = audio.current.duration;
		const playing = !audio.current.paused;

		if (Number.isNaN(duration) || !Number.isFinite(duration)) {
			duration = undefined;
		}

		currentPlayer.current.dataset.audioCurrentTime = currentTime.toString();
		currentPlayer.current.dataset.audioDuration = duration?.toString() ?? "0";
		currentPlayer.current.dataset.audioActive = "true";

		// currentPlayer.current.style.setProperty("--buffered", buffered.toString());
		currentPlayer.current.style.setProperty("--current-time", currentTime.toString());
		currentPlayer.current.style.setProperty("--duration", duration?.toString() ?? null);

		const timestamps = currentPlayer.current.querySelector<HTMLDivElement>(".js-audio-player-timestamps");

		if (timestamps != null) {
			timestamps.innerHTML = timestampHtml(currentTime, duration);
		}

		const button = currentPlayer.current.querySelector<HTMLButtonElement>(".js-audio-player-play");

		if (button != null) {
			button.innerText = playing ? "||" : "|>";
		}
	}, []);

	const syncCurrentTime = useCallback(() => {
		setCurrentTime(audio.current.currentTime);
		syncPlayer();
	}, [syncPlayer]);

	const loadNewPlayer = useCallback((player: Element | null, startTime?: (duration: number | undefined) => number): void => {
		if (
			!(player instanceof HTMLDivElement) ||
			!player.dataset.audioCoverUrl ||
			!player.dataset.audioId ||
			!player.dataset.audioSrc ||
			!player.dataset.audioTitle
		) {
			throw new Error("Invalid player");
		}

		const newPlayerCurrentTime = player.dataset.audioCurrentTime != null
			? Number.parseInt(player.dataset.audioCurrentTime, 10)
			: 0;

		// Stop current audio and sync state of player
		audio.current.pause();
		syncCurrentTime();

		// Clear active marker from previous player
		if (currentPlayer.current != null) {
			delete currentPlayer.current.dataset.audioActive;
		}

		// Load new player
		currentPlayer.current = player;
		audio.current.src = player.dataset.audioSrc;
		audio.current.pause();
		audio.current.load(); // Resets buffered state apparentyl
		setCoverUrl(player.dataset.audioCoverUrl);
		setId(Number.parseInt(player.dataset.audioId, 10));
		setTitle(player.dataset.audioTitle);

		const seekAndPlay = () => {
			const durationValue = Number.isFinite(audio.current.duration)
				? audio.current.duration
				: undefined;
			const desiredStart = startTime?.(durationValue) ?? newPlayerCurrentTime;
			const safeStart =
				typeof desiredStart === "number" && Number.isFinite(desiredStart)
					? desiredStart
					: 0;

			audio.current.currentTime = safeStart;
			audio.current.play().catch();
		};

		if (Number.isFinite(audio.current.duration)) {
			seekAndPlay();
		} else {
			audio.current.addEventListener("loadedmetadata", seekAndPlay, { once: true });
		}
	}, [syncCurrentTime]);

	const addToHistory = useCallback((player: HTMLDivElement) => {
		const history = playHistoryRef.current;
		const currentIndex = historyIndexRef.current;

		if (history[currentIndex] === player)
			return;

		// If we're not at the end of history, truncate everything after current position
		if (currentIndex >= 0 && currentIndex < history.length - 1)
			history.splice(currentIndex + 1);

		// Add the new player to history
		history.push(player);

		// Keep history trimmed
		if (history.length > 100)
			history.shift();

		historyIndexRef.current = history.length - 1;
	}, []);

	const loadPlayerWithHistory = useCallback(
		(player: HTMLDivElement, startTime?: (duration: number | undefined) => number) => {
			addToHistory(player);
			loadNewPlayer(player, startTime);
		},
		[addToHistory, loadNewPlayer],
	);

	const navigateToTrack = useCallback(
		(direction: "next" | "prev"): void => {
			if (!allPlayers.current.length || !currentPlayer.current) {
				return;
			}

			const history = playHistoryRef.current;
			const historyIndex = historyIndexRef.current;
			let targetTrack: HTMLDivElement | null = null;

			if (direction === "next") {
				// If not at the end, return next from history
				if (historyIndex >= 0 && historyIndex < history.length - 1) {
					targetTrack = history[historyIndex + 1] ?? null;
					if (targetTrack) {
						historyIndexRef.current = historyIndex + 1;
						loadNewPlayer(targetTrack);
					}
					return;
				}

				const playerIndex = allPlayers.current.findIndex((player) => player === currentPlayer.current);
				if (playerIndex >= 0) {
					let nextPlayerIndex = (playerIndex + 1) % allPlayers.current.length;

					if (shuffle && allPlayers.current.length > 1) {
						// Generate random index that's different from current index
						const legalIndices = allPlayers.current
							.map((_, index) => index)
							.filter(index => index !== playerIndex);

						if (legalIndices.length > 0) {
							nextPlayerIndex = legalIndices[Math.floor(Math.random() * legalIndices.length)]!;
						}
					}

					targetTrack = allPlayers.current[nextPlayerIndex] ?? null;
				} else {
					// If current player is not found, just return the first player I guess
					targetTrack = allPlayers.current[0] ?? null;
				}
			} else { // direction === 'prev'
				// If not at the beginning, go back in history
				if (historyIndex > 0 && history.length > 1) {
					targetTrack = history[historyIndex - 1] ?? null;
					if (targetTrack) {
						historyIndexRef.current = historyIndex - 1;
						// Don't add to history when going back
						loadNewPlayer(targetTrack);
					}
					return;
				}

				const playerIndex = allPlayers.current.findIndex((player) => player === currentPlayer.current);
				if (playerIndex >= 0) {
					const prevPlayerIndex = playerIndex === 0
						? allPlayers.current.length - 1
						: playerIndex - 1;
					targetTrack = allPlayers.current[prevPlayerIndex] ?? null;
				} else {
					// If current player is not found, just return the last player I guess
					targetTrack = allPlayers.current[allPlayers.current.length - 1] ?? null;
				}
			}

			if (targetTrack)
				loadPlayerWithHistory(targetTrack);
		},
		[shuffle, loadNewPlayer, loadPlayerWithHistory],
	);

	useRequestAnimationFrame(syncCurrentTime, playing);

	// Set initial player preferences
	useEffect(() => {
		// Load preferences from localStorage
		const savedShuffle = localStorage.getItem('audioPlayerShuffle');
		if (savedShuffle !== null) {
			setShuffle(savedShuffle === 'true');
		}
		
		const savedMuted = localStorage.getItem('audioPlayerMuted');
		if (savedMuted !== null) {
			const mutedValue = savedMuted === 'true';
			setMuted(mutedValue);
			audio.current.muted = mutedValue;
		} else {
			audio.current.muted = muted;
		}
		
		const savedVolume = localStorage.getItem('audioPlayerVolume');
		if (savedVolume !== null) {
			const volumeValue = parseFloat(savedVolume);
			if (!isNaN(volumeValue) && volumeValue >= 0 && volumeValue <= 1) {
				setVolume(volumeValue);
				audio.current.volume = volumeValue;
			} else {
				audio.current.volume = volume;
			}
		} else {
			audio.current.volume = volume;
		}
	}, []);

	useEffect(() => {
		const findAllPlayers = () => {
			allPlayers.current = [...document.querySelectorAll<HTMLDivElement>(".js-audio-player")];
		};

		const observer = new MutationObserver(findAllPlayers);

		observer.observe(document, {
			childList: true,
			subtree: true,
		});

		findAllPlayers();

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			if (
				!(event.target instanceof HTMLButtonElement) ||
				!event.target.classList.contains("js-audio-player-play")
			) {
				return;
			}

			const player = event.target.closest(".js-audio-player");

			if (!(player instanceof HTMLDivElement)) {
				throw new Error("Invalid player");
			}

			event.preventDefault();

			// If the player is the current player, toggle play/pause state
			if (player === currentPlayer.current) {
				if (audio.current.paused) {
					audio.current.play().catch();
				} else {
					audio.current.pause();
				}
				return;
			}

			// Otherwise, load the new player
			loadPlayerWithHistory(player);
		};

		const onMouseUp = (event: MouseEvent) => {
			if (!(event.target instanceof HTMLElement)) {
				return;
			}

			const bar = event.target.closest(".js-audio-player-bar");

			if (bar == null) {
				return;
			}

			event.preventDefault();

			const player = event.target.closest(".js-audio-player");
			const targetRect = bar.getBoundingClientRect();
			const x = event.clientX - targetRect.x;
			const xRelative = x / targetRect.width;

			// Just fuckin do nothing if no player's found
			if (!(player instanceof HTMLDivElement)) {
				return;
			}

			// If the player is the current player, set and sync currentTime
			if (player === currentPlayer.current) {
				if (Number.isNaN(audio.current.duration) || !Number.isFinite(audio.current.duration)) {
					return;
				}

				audio.current.currentTime = xRelative * audio.current.duration;
				audio.current.play().catch();
				return;
			}

			// Otherwise, load the new player starting at requested time
			loadPlayerWithHistory(
				player,
				(duration) => {
					if (duration == null || Number.isNaN(duration) || !Number.isFinite(duration)) {
						return 0;
					}

					return xRelative * duration;
				},
			);
		};

		document.addEventListener("click", onClick);
		document.addEventListener("mouseup", onMouseUp);

		return () => {
			document.removeEventListener("click", onClick);
			document.removeEventListener("mouseup", onMouseUp);
		};
	}, [loadPlayerWithHistory]);

	useEffect(() => {
		// const onCanPlayThrough = () => {
		// 	setBuffered(audio.current.duration);

		// 	if (currentPlayer.current != null) {
		// 		currentPlayer.current.dataset.buffered = audio.current.duration.toString();
		// 		currentPlayer.current.style.setProperty("--buffered", audio.current.duration.toString());
		// 	}
		// };

		const onDurationChange = () => {
			setDuration(audio.current.duration);
			syncPlayer();
		};

		const onEnded = () => {
			audio.current.pause();
			audio.current.currentTime = 0;
			syncCurrentTime();

			navigateToTrack('next');
		};

		const onPlayAndPause = () => {
			setPlaying(!audio.current.paused);
			syncCurrentTime();
		};

		// const onProgress = () => {
		// 	const bufferedLength = audio.current.buffered.length;

		// 	for (let i = 0; i < bufferedLength; i++) {
		// 		const currentTime = audio.current.currentTime;
		// 		const rangeStartTime = audio.current.buffered.start(i);
		// 		const rangeEndTime = audio.current.buffered.end(i);

		// 		if (rangeStartTime <= currentTime && rangeEndTime >= currentTime) {
		// 			setBuffered((prev) => Math.max(prev, rangeEndTime));
		// 			currentPlayer.current?.style.setProperty("--buffered", rangeEndTime.toString()); // TODO missing prev handling like above
		// 			return;
		// 		}
		// 	}
		// };

		const onVolumeChange = () => {
			setMuted(audio.current.muted);
			setVolume(audio.current.volume);
		};

		// audio.current.addEventListener("canplaythrough", onCanPlayThrough);
		audio.current.addEventListener("durationchange", onDurationChange);
		audio.current.addEventListener("ended", onEnded);
		audio.current.addEventListener("pause", onPlayAndPause);
		audio.current.addEventListener("play", onPlayAndPause);
		// audio.current.addEventListener("progress", onProgress);
		audio.current.addEventListener("volumechange", onVolumeChange);

		return () => {
			// audio.current.removeEventListener("canplaythrough", onCanPlayThrough);
			audio.current.removeEventListener("durationchange", onDurationChange);
			audio.current.removeEventListener("ended", onEnded);
			audio.current.removeEventListener("pause", onPlayAndPause);
			audio.current.removeEventListener("play", onPlayAndPause);
			// audio.current.removeEventListener("progress", onProgress);
			audio.current.removeEventListener("volumechange", onVolumeChange);
		};
	}, [navigateToTrack, syncCurrentTime, syncPlayer]);

	// UI event handlers
	const onBarMouseUp: MouseEventHandler<HTMLDivElement> = (event) => {
		event.preventDefault();

		if (Number.isNaN(audio.current.duration) || !Number.isFinite(audio.current.duration)) {
			return;
		}

		const targetRect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - targetRect.x;
		const xRelative = x / targetRect.width;

		audio.current.currentTime = xRelative * audio.current.duration;
		audio.current.play().catch();
	};

	const onMuteClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();

		const newMuted = !audio.current.muted;
		audio.current.muted = newMuted;
		localStorage.setItem('audioPlayerMuted', newMuted.toString());
	};

	const onPlayPauseClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();

		if (audio.current.paused) {
			audio.current.play().catch();
		} else {
			audio.current.pause();
		}
	};

	const onShuffleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();
		const newShuffle = !shuffle;
		setShuffle(newShuffle);
		localStorage.setItem('audioPlayerShuffle', newShuffle.toString());
	};

	const onNextTrackClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();
		navigateToTrack('next');
	};

	const onPrevTrackClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();
		navigateToTrack('prev');
	};

	const onVolumeWheel = useCallback((event: WheelEvent) => {
		event.preventDefault();

		const step = event.ctrlKey || event.shiftKey ? 0.01 : 0.05;
		const delta = event.deltaY < 0 ? 1 : -1;
		const newVolume = Math.min(Math.max(delta * step + audio.current.volume, 0), 1);
		audio.current.volume = newVolume;
		localStorage.setItem('audioPlayerVolume', newVolume.toString());
	}, []);

	useEffect(() => {
		const element = volumeRef.current;
		if (element == null) {
			return;
		}

		element.addEventListener("wheel", onVolumeWheel, { passive: false });

		return () => element.removeEventListener("wheel", onVolumeWheel);
	}, [onVolumeWheel]);

	// Render
	return (
		<div className="audio-player-master-container">
			<h2>{title}</h2>
			<div
				className="audio-player"
				style={{
					// "--buffered": buffered,
					"--current-time": currentTime,
					"--duration": duration,
				}}
			>
				<button
					onClick={onPrevTrackClick}
					className="audio-player-prev"
					aria-label="Play previous track"
				>
					⏮
				</button>
				<button onClick={onPlayPauseClick} aria-label={playing ? "Pause track" : "Play track"}>
					{playing ? "||" : "|>"}
				</button>
				<button
					onClick={onNextTrackClick}
					className="audio-player-next"
					aria-label="Play next track"
				>
					⏭
				</button>
				<div className="audio-player-bar" onMouseUp={onBarMouseUp}>
					{/* <div className="audio-player-bar-fill audio-player-bar-fill-buffered" /> */}
					<div className="audio-player-bar-fill audio-player-bar-fill-current-time" />
					<div
						className="audio-player-timestamps"
						dangerouslySetInnerHTML={{ __html: timestampHtml(currentTime, duration) }}
					/>
				</div>
				<button 
					onClick={onShuffleClick} 
					className={`audio-player-shuffle ${shuffle ? "audio-player-shuffle-active" : ""}`}
					aria-label="Toggle shuffle"
					aria-pressed={shuffle}
				>
					⤭
				</button>
				<div
					className={`audio-player-volume-control ${muted ? "audio-player-volume-control-muted" : ""}`}
					ref={volumeRef}
					role="status"
					aria-live="polite"
				>
					{Math.round(volume * 100)}%
				</div>
				<button
					onClick={onMuteClick}
					className="audio-player-mute"
					aria-label={muted ? "Unmute audio" : "Mute audio"}
					aria-pressed={muted}
				>
					{muted ? "U" : "M"}
				</button>
			</div>
			<div
				className="web-scrobbler-extension"
				style={{ display: "none" }}
				data-artist="𝙻ΛƬΣX 4000"
				data-track={title}
				// data-album
				// data-album-artist
				data-duration={duration}
				data-current-time={currentTime}
				data-unique-id={id}
				data-playing={playing ? "1" : ""}
				data-track-art={coverUrl}
			/>
		</div>
	);
}

function useRequestAnimationFrame(callback: FrameRequestCallback, active: boolean): void {
	const requestIdRef = useRef<number>(null);

	useEffect(() => {
		if (!active) {
			return;
		}

		const internalCallback: FrameRequestCallback = (time) => {
			callback(time);
			requestIdRef.current = requestAnimationFrame(internalCallback);
		};

		requestIdRef.current = requestAnimationFrame(internalCallback);

		return () => {
			if (requestIdRef.current != null) {
				cancelAnimationFrame(requestIdRef.current);
			}
		};
	}, [active, callback]);
}
