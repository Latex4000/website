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
	if (Number.isNaN(duration) || !Number.isFinite(duration)) {
		duration = undefined;
	}

	return (
		`<span>${formatTimestamp(duration && currentTime)}</span>` +
		"/" +
		`<span>${formatTimestamp(duration)}</span>`
	);
}

interface AudioPlayerProps {
	coverUrl?: string;
	durationGuess?: number;
	src: string;
	title: string;
	trackType: string;
}

export function AudioPlayer({ coverUrl, durationGuess, src, title, trackType }: AudioPlayerProps) {
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
			data-audio-src={src}
			data-audio-title={title}
			data-audio-cover={coverUrl}
			style={{ "--duration": durationGuess }}
		>
			<button className="audio-player-play js-audio-player-play">{"|>"}</button>
			<div className="audio-player-bar js-audio-player-bar">
				{/* <div className="audio-player-bar-fill audio-player-bar-fill-buffered" /> */}
				<div className="audio-player-bar-fill audio-player-bar-fill-current-time" />
				<div
					className="audio-player-timestamps js-audio-player-timestamps"
					dangerouslySetInnerHTML={{ __html: timestampHtml(0, durationGuess) }}
				/>
			</div>
			{/* <button onClick={onBookmarkClick} className="audio-player-bookmark">*</button> */}
			<button onClick={onDownloadClick} className="audio-player-download">↓</button>
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
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState<number | undefined>();
	const [muted, setMuted] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [shuffle, setShuffle] = useState(false);
	const [title, setTitle] = useState("<no sound playing>");
	const [volume, setVolume] = useState(0.35);

	const allPlayers = useRef<HTMLDivElement[]>(null);
	const currentPlayer = useRef<HTMLDivElement>(null);
	const audio = useRef(new Audio());
	const volumeRef = useRef<HTMLDivElement>(null);

	const syncPlayer = () => {
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
	};

	const syncCurrentTime = useCallback(() => {
		setCurrentTime(audio.current.currentTime);
		syncPlayer();
	}, []);

	const loadNewPlayer = (player: Element | null, startTime?: (duration: number) => number): void => {
		if (
			!(player instanceof HTMLDivElement) ||
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
		setTitle(player.dataset.audioTitle);

		// TODO this barely works and should probably just keep around old Audio to switch back to
		audio.current.addEventListener("durationchange", () => {
			const currentTime = startTime?.(audio.current.duration) ?? newPlayerCurrentTime;

			const intervalId = setInterval(() => {
				const bufferedEnd = audio.current.buffered.end(audio.current.buffered.length - 1);

				if (bufferedEnd >= currentTime) {
					clearInterval(intervalId);
					audio.current.currentTime = currentTime;
					audio.current.play().catch();
				}
			}, 25);
		}, { once: true });
	};

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
			loadNewPlayer(player);
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
			loadNewPlayer(
				player,
				(duration) => Number.isNaN(duration) || !Number.isFinite(duration)
					? 0
					: xRelative * duration,
			);
		};

		document.addEventListener("click", onClick);
		document.addEventListener("mouseup", onMouseUp);

		return () => {
			document.removeEventListener("click", onClick);
			document.removeEventListener("mouseup", onMouseUp);
		};
	}, []);

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

			if (allPlayers.current == null) {
				throw new Error("Invalid players list");
			}

			const playerIndex = allPlayers.current.findIndex((player) => player === currentPlayer.current);

			if (playerIndex < 0) {
				throw new Error("Invalid players list");
			}

			let nextPlayerIndex = (playerIndex + 1) % allPlayers.current.length;
			if (shuffle) {
				// Generate random index that's different from current index
				const legalIndices = allPlayers.current
					.map((_, index) => index)
					.filter(index => index !== playerIndex);

				if (legalIndices.length > 0) {
					nextPlayerIndex = legalIndices[Math.floor(Math.random() * legalIndices.length)]!;
				}
			}

			loadNewPlayer(allPlayers.current[nextPlayerIndex]!);
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
	}, [shuffle]);

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

	const onVolumeWheel = (event: WheelEvent) => {
		event.preventDefault();

		const step = event.ctrlKey || event.shiftKey ? 0.01 : 0.05;

		const newVolume = Math.min(Math.max((event.deltaY < 0 ? 1 : -1) * step + audio.current.volume, 0), 1);
		audio.current.volume = newVolume;
		localStorage.setItem('audioPlayerVolume', newVolume.toString());
	};

	useEffect(() => {
		if (volumeRef.current == null) {
			return;
		}

		volumeRef.current.addEventListener("wheel", onVolumeWheel, { passive: false });

		return () => volumeRef.current?.removeEventListener("wheel", onVolumeWheel);
	}, [volumeRef.current]);

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
				<button onClick={onPlayPauseClick}>{playing ? "||" : "|>"}</button>
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
				>
					⤭
				</button>
				<div
					className={`audio-player-volume-control ${muted ? "audio-player-volume-control-muted" : ""}`}
					ref={volumeRef}
				>
					{Math.round(volume * 100)}%
				</div>
				<button onClick={onMuteClick} className="audio-player-mute">{muted ? "U" : "M"}</button>
			</div>
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
