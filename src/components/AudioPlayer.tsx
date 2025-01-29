import "./AudioPlayer.css";
import { useEffect, useRef, useState, type MouseEventHandler, type RefObject } from "react";

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

interface AudioPlayerProps {
	durationGuess?: number;
	src: string;
}

export default function AudioPlayer({ durationGuess, src }: AudioPlayerProps) {
	const [buffered, setBuffered] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(durationGuess);
	const [muted, setMuted] = useState(false);
	const [playing, setPlaying] = useState(false);
	const [volume, setVolume] = useState(1);

	// The typing here is safe as long as all usage of audioRef happens in event handlers
	const audioRef = useRef<HTMLAudioElement>(null) as RefObject<HTMLAudioElement>;
	const volumeRef = useRef<HTMLDivElement>(null);

	const syncCurrentTime = () => setCurrentTime(audioRef.current.currentTime);

	useRequestAnimationFrame(syncCurrentTime, playing);

	useEffect(() => {
		if (volumeRef.current == null) {
			return;
		}

		volumeRef.current.addEventListener("wheel", onVolumeWheel, { passive: false });

		return () => volumeRef.current?.removeEventListener("wheel", onVolumeWheel);
	}, [volumeRef.current]);

	// UI event handlers
	const onBarMouseUp: MouseEventHandler<HTMLDivElement> = (event) => {
		event.preventDefault();

		const targetRect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - targetRect.x;
		const xRelative = x / targetRect.width;

		audioRef.current.currentTime = xRelative * audioRef.current.duration;
		syncCurrentTime();
	};

	const onMuteClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();

		audioRef.current.muted = !audioRef.current.muted;
	};

	const onPlayPauseClick: MouseEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();

		if (playing) {
			audioRef.current.pause();
		} else {
			audioRef.current.play().catch();
		}
	};

	const onVolumeWheel = (event: WheelEvent) => {
		event.preventDefault();

		const step = 0.05;
		audioRef.current.volume = Math.min(Math.max((event.deltaY < 0 ? 1 : -1) * step + audioRef.current.volume, 0), 1);
	};

	// Audio event handlers
	const onCanPlayThrough = () => {
		setBuffered(audioRef.current.duration);
	};

	const onDurationChange = () => {
		setDuration(audioRef.current.duration);
	};

	const onEnded = () => {
		audioRef.current.pause();
		audioRef.current.currentTime = 0;
		syncCurrentTime();
	};

	const onPause = () => {
		setPlaying(false);
	};

	const onPlay = () => {
		setPlaying(true);
	};

	const onProgress = () => {
		const bufferedLength = audioRef.current.buffered.length;

		for (let i = 0; i < bufferedLength; i++) {
			const currentTime = audioRef.current.currentTime;
			const rangeStartTime = audioRef.current.buffered.start(i);
			const rangeEndTime = audioRef.current.buffered.end(i);

			if (rangeStartTime <= currentTime && rangeEndTime >= currentTime) {
				setBuffered((prev) => Math.max(prev, rangeEndTime));
				return;
			}
		}
	};

	const onVolumeChange = () => {
		setMuted(audioRef.current.muted);
		setVolume(audioRef.current.volume);
	};

	// Render
	const progress = duration ? currentTime / duration : 0;
	const bufferProgress = duration ? buffered / duration : 0;

	return (
		<div className="audio-player">
			<button onClick={onPlayPauseClick}>{playing ? "||" : "|>"}</button>
			<div className="audio-player-bar" onMouseUp={onBarMouseUp}>
				<div className="audio-player-bar-fill audio-player-bar-fill-buffered" style={{ "--progress": bufferProgress }} />
				<div className="audio-player-bar-fill" style={{ "--progress": progress }} />
				<div className="audio-player-timestamps">
					<span>{formatTimestamp(duration && currentTime)}</span>
					/
					<span>{formatTimestamp(duration)}</span>
				</div>
			</div>
			<button onClick={onMuteClick} className="audio-player-mute">{muted ? "U" : "M"}</button>
			<div
				className={`audio-player-volume-control ${muted ? "audio-player-volume-control-muted" : ""}`}
				ref={volumeRef}
			>
				{Math.round(volume * 100)}%
			</div>
			<audio
				src={src}
				preload="none"
				ref={audioRef}

				onCanPlayThrough={onCanPlayThrough}
				onDurationChange={onDurationChange}
				onEnded={onEnded}
				onError={onEnded}
				onPause={onPause}
				onPlay={onPlay}
				onProgress={onProgress}
				onVolumeChange={onVolumeChange}
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
	}, [active]);
}
