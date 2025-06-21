<script lang="ts">
    import type { InferSelectModel } from "drizzle-orm";
    import type { Tunicwild } from "../../database/schema";

    type SongData = Pick<
        InferSelectModel<typeof Tunicwild>,
        "composer" | "game" | "id" | "officialLink" | "title"
    >;

    const date = new Date();

    const { songList }: { songList: SongData[] } = $props();
    const gameGroupedSongList = $derived(
        songList.reduce(
            (acc, song) => {
                if (!acc[song.game]) acc[song.game] = [];
                acc[song.game]!.push(song);
                return acc;
            },
            {} as Record<string, SongData[]>,
        ),
    );

    // server data
    let songData = $state() as {
        session: {
            guesses: (number | null)[];
            result: boolean | null;
        };
        tunicwild: Partial<InferSelectModel<typeof Tunicwild>> & {
            audioUrl: string;
        };
    };
    let currentGuess = $state({ id: -1, guess: "" });
    let error = $state("");
    let isPlaying = $state(false);
    let showDropdown = $state(false);
    let showSongList = $state(false);
    let audioElement: HTMLAudioElement | null = $state(null);
    let currentTime = $state(0);
    let animationFrameId: number | null = null;

    const maxGuesses = 6;
    const clipLengths = [1, 2, 4, 8, 16, 32];
    const gameHintAfter = 3;

    // Stuff derived from server data (songData)
    const guesses = $derived(songData?.session.guesses || []);
    const gameWon = $derived(songData?.session.result === true);
    const gameLost = $derived(songData?.session.result === false);
    const currentGuessCount = $derived(guesses.length);
    const showGameHint = $derived(
        currentGuessCount >= gameHintAfter &&
            !gameWon &&
            !gameLost &&
            songData?.tunicwild.game,
    );

    const filterProperties = ["title", "game", "composer"] as const;
    const filteredSongs = $derived(
        currentGuess.guess.trim()
            ? songList
                  .filter((song) =>
                      filterProperties.some((property) =>
                          song[property]
                              .toLowerCase()
                              .includes(
                                  currentGuess.guess.trim().toLowerCase(),
                              ),
                      ),
                  )
                  .sort((a, b) => {
                      for (const property of filterProperties) {
                          const comparison = a[property].localeCompare(
                              b[property],
                          );

                          if (comparison) {
                              return comparison;
                          }
                      }

                      return 0;
                  })
                  .slice(0, 8)
            : [],
    );

    $effect(() => {
        if (currentGuess.guess.trim()) showDropdown = true;
        else showDropdown = false;
    });

    // Unironically just for updating the current time of the audio for the progress bar
    $effect(() => {
        if (!audioElement) return;

        const updateProgress = () => {
            if (audioElement && !audioElement.paused) {
                currentTime = audioElement.currentTime;
                animationFrameId = requestAnimationFrame(updateProgress);
            }
        };

        const handlePlay = () => {
            updateProgress();
        };

        const handlePause = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            currentTime = audioElement!.currentTime;
        };

        const handleLoadedMetadata = () => {
            currentTime = audioElement!.currentTime;
        };

        audioElement.addEventListener("play", handlePlay);
        audioElement.addEventListener("pause", handlePause);
        audioElement.addEventListener("ended", handlePause);
        audioElement.addEventListener("loadedmetadata", handleLoadedMetadata);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            audioElement!.removeEventListener("play", handlePlay);
            audioElement!.removeEventListener("pause", handlePause);
            audioElement!.removeEventListener("ended", handlePause);
            audioElement!.removeEventListener(
                "loadedmetadata",
                handleLoadedMetadata,
            );
        };
    });

    // Force reload the audio when the URL changes
    $effect(() => {
        if (audioElement && songData?.tunicwild.audioUrl) {
            audioElement.load();
            currentTime = 0;
        }
    });

    getSongData()
        .then((value) => (songData = value))
        .catch((err) => {
            console.error("Failed to fetch song data:", err);
            error = `${err.message}`;
        });

    async function getSongData(): Promise<{
        session: {
            guesses: (number | null)[];
            result: boolean | null;
        };
        tunicwild: Partial<InferSelectModel<typeof Tunicwild>> & {
            audioUrl: string;
        };
    }> {
        const adjustedTimestamp =
            date.getTime() - new Date().getTimezoneOffset() * 60 * 1000;

        const res = await fetch(
            `/tunicwilds/today?timestamp=${adjustedTimestamp}`,
        ).then((res) => res.json());

        if (res.error) throw new Error(res.error);
        return res;
    }

    async function submitGuess(guessId: number | null = null) {
        if (!songData) return;

        try {
            const adjustedTimestamp =
                date.getTime() - new Date().getTimezoneOffset() * 60 * 1000;

            const response = await fetch("/tunicwilds/today", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    timestamp: adjustedTimestamp,
                    guess: guessId,
                }),
            });

            // The response contains the updated data regardless of redirect
            const updatedData = await response.json();
            if (updatedData.error) {
                throw new Error(updatedData.error);
            }
            songData = updatedData;
        } catch (err) {
            console.error("Failed to submit guess:", err);
            error = `Failed to submit guess: ${err}`;
        }
    }

    async function selectSong(songTitle: { id: number; guess: string }) {
        currentGuess = songTitle;
        showDropdown = false;
        await handleGuess(songTitle);
    }

    async function skipGuess() {
        if (gameWon || gameLost) return;
        await submitGuess(null); // Submit null for skip
        currentGuess = { id: -1, guess: "" };
        showDropdown = false;
    }

    async function handleGuess(guessedSong = currentGuess) {
        if (!guessedSong.guess.trim() || gameWon || gameLost) return;

        const validSong = songList.find((song) => song.id === guessedSong.id);

        if (!validSong) return;

        await submitGuess(validSong.id);
        currentGuess = { id: -1, guess: "" };
        showDropdown = false;
    }

    function playClip() {
        if (!audioElement || gameLost || gameWon) return;

        const duration =
            clipLengths[currentGuessCount] ||
            clipLengths[clipLengths.length - 1]!;
        audioElement.currentTime = 0;
        audioElement.play();
        isPlaying = true;

        setTimeout(() => {
            if (audioElement) {
                audioElement.pause();
                isPlaying = false;
            }
        }, duration * 1000);
    }

    function pauseClip() {
        if (!audioElement) return;
        audioElement.pause();
        isPlaying = false;
    }

    function shareResult() {
        if (!songData?.tunicwild.title || !songData?.tunicwild.game) return;

        const attempts = gameWon ? currentGuessCount : "X";
        const squares = guesses
            .map((guessId) => {
                if (guessId === null) return "🖤"; // Skip

                const guessedSong = songList.find(
                    (song) => song.id === guessId,
                );
                if (!guessedSong) return "💔";

                const correctSong = songData.tunicwild;

                // Perfect match
                if (
                    guessedSong.title.toLowerCase() ===
                        correctSong.title?.toLowerCase() &&
                    guessedSong.game.toLowerCase() ===
                        correctSong.game?.toLowerCase()
                ) {
                    return "💚";
                }

                // Same game
                if (
                    guessedSong.game.toLowerCase() ===
                    correctSong.game?.toLowerCase()
                ) {
                    return "💛";
                }

                // Same title (different game)
                if (
                    guessedSong.title.toLowerCase() ===
                    correctSong.title?.toLowerCase()
                ) {
                    return "💙";
                }

                return "💔"; // Wrong
            })
            .join("");

        const shareText = `Tunicwilds ${date.toLocaleDateString()} ${attempts}/${maxGuesses}\n\n${squares}`;

        if (navigator.share) navigator.share({ text: shareText });
        else {
            navigator.clipboard.writeText(shareText);
            alert("Results copied to clipboard!");
        }
    }

    function getCurrentClipLength(): number | undefined {
        return (
            clipLengths[currentGuessCount] ||
            clipLengths[clipLengths.length - 1]
        );
    }

    function handleClickOutside(event: MouseEvent) {
        if (!(event.target as HTMLElement).closest(".dropdown-container"))
            showDropdown = false;

        if (!(event.target as HTMLElement).closest(".song-list-overlay"))
            showSongList = false;
    }

    function songFromID(id: number | null | undefined): SongData | undefined {
        if (!id) return undefined;
        return songList.find((song) => song.id === id);
    }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="container">
    <!-- Header -->
    <div class="header">
        <h1>TUNICWILDS</h1>
        <p class="subtitle">Guess the song from the game</p>
        <p class="game-info">
            {date.toLocaleDateString()} • {currentGuessCount}/{maxGuesses} guesses
        </p>
    </div>

    {#if showSongList}
        <div class="song-list-overlay">
            <div class="song-list">
                <h2>Song List</h2>
                <button
                    class="close-btn"
                    onclick={() => (showSongList = false)}
                >
                    Close
                </button>
                {#each Object.entries(gameGroupedSongList) as [game, songs]}
                    <div class="game-section">
                        <h3>{game}</h3>
                        <ul>
                            {#each songs as song}
                                <li>
                                    <a href={song.officialLink} target="_blank"
                                        >{song.composer} - {song.title}</a
                                    >
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    {#if error}
        <p>Error: {error}</p>
    {:else if songData == null}
        <p>Loading today's song...</p>
    {:else}
        <!-- Game Over - Answer Display (Top) -->
        {#if gameWon || gameLost}
            <div class="game-over">
                <div class="answer-display">
                    <h3>"{songData.tunicwild.title}"</h3>
                    <p class="game-name">
                        from <strong>{songData.tunicwild.game}</strong>
                    </p>
                    <p class="composer">
                        Composed by {songData.tunicwild.composer}
                    </p>
                </div>

                {#if gameWon}
                    <div class="result">
                        <h2 class="win">Nice</h2>
                        <p>
                            You guessed it in {currentGuessCount} attempt{currentGuessCount !==
                            1
                                ? "s"
                                : ""}!
                        </p>
                    </div>
                {:else}
                    <div class="result">
                        <h2 class="lose">😔 Game Over</h2>
                        <p>Better luck next time!</p>
                    </div>
                {/if}

                <div class="game-over-buttons">
                    <button onclick={shareResult} class="share-btn">
                        Share
                    </button>
                </div>
            </div>
        {/if}

        <!-- Guesses List -->
        <div class="guesses-list">
            <h3>Your Guesses:</h3>
            <div class="guesses">
                {#each Array(maxGuesses) as _, index}
                    {@const guessId = guesses[index]}
                    {@const guessedSong = songFromID(guessId)}
                    {@const isSkip = guessId === null}
                    {@const isEmpty = guessId === undefined}
                    {@const isCorrect =
                        guessedSong &&
                        songData.tunicwild.title &&
                        guessedSong.title.toLowerCase() ===
                            songData.tunicwild.title.toLowerCase()}

                    <div
                        class="guess-item {isCorrect
                            ? 'correct'
                            : isSkip
                              ? 'skipped'
                              : isEmpty
                                ? 'empty'
                                : 'incorrect'}"
                    >
                        <div class="guess-content">
                            <div>
                                <div class="guess-title">
                                    {isEmpty
                                        ? "—"
                                        : isSkip
                                          ? "Skipped"
                                          : guessedSong?.title || "Unknown"}
                                </div>
                                {#if guessedSong && !isSkip && !isEmpty}
                                    <div class="guess-game">
                                        {guessedSong.game}
                                    </div>
                                {/if}
                            </div>
                            <span class="clip-duration">
                                {clipLengths[index]}s clip
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Audio Player -->
        <div class="audio-player">
            <div class="audio-info">
                <div class="clip-info">
                    Clip length: {getCurrentClipLength()}s
                </div>
                {#if !gameWon && !gameLost}
                    <div class="attempt-info">
                        Attempt {currentGuessCount + 1} of {maxGuesses}
                    </div>
                {/if}
            </div>

            <div class="audio-controls">
                <button
                    onclick={isPlaying ? pauseClip : playClip}
                    class="play-btn"
                >
                    {isPlaying ? "⏸️ Pause" : "▶️ Play"}
                </button>
            </div>

            <!-- Game Hint -->
            {#if showGameHint && !gameWon && !gameLost}
                <div class="hint">
                    💡 <strong>Hint:</strong> This song is from
                    <strong>{songData.tunicwild.game}</strong>
                </div>
            {/if}

            <!-- Progress bar -->
            <div class="progress-bar">
                {#each clipLengths as length}
                    <div
                        class="progress-marker"
                        style="left: {(length / 32) * 100}%"
                    ></div>
                {/each}
                <div
                    class="progress-fill"
                    style="width: {(currentTime / 32) * 100}%"
                ></div>
            </div>

            <audio bind:this={audioElement} preload="auto">
                <source src={songData.tunicwild.audioUrl} type="audio/mp3" />
            </audio>
        </div>

        <!-- Guess Input with Autocomplete -->
        {#if !gameWon && !gameLost}
            <div class="guess-input dropdown-container">
                <p class="input-hint">
                    You must select from the autocomplete suggestions
                </p>
                <div class="input-wrapper">
                    <input
                        type="text"
                        bind:value={currentGuess.guess}
                        onfocus={() =>
                            currentGuess.guess.trim() && (showDropdown = true)}
                        placeholder="Start typing a song title..."
                        disabled={gameWon || gameLost}
                    />
                    <span class="dropdown-arrow">⌄</span>
                </div>

                <!-- Autocomplete Dropdown -->
                {#if showDropdown && filteredSongs.length > 0}
                    <div class="dropdown">
                        {#each filteredSongs as song}
                            <button
                                onclick={() =>
                                    selectSong({
                                        id: song.id,
                                        guess: song.title,
                                    })}
                                class="dropdown-item"
                            >
                                <div class="song-title">{song.title}</div>
                                <div class="song-meta">
                                    {song.game} • {song.composer}
                                </div>
                            </button>
                        {/each}
                    </div>
                {/if}

                <!-- Skip -->
                <button
                    onclick={skipGuess}
                    class="skip-btn"
                    disabled={gameWon || gameLost}
                >
                    Skip
                </button>
            </div>
        {/if}
    {/if}
</div>

<style>
    .container {
        min-height: 100vh;
        max-width: 42rem;
        margin: 0 auto;
    }

    .header {
        text-align: center;
    }

    .song-list-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .game-over {
        text-align: center;
        margin-bottom: 1.5rem;
    }

    .answer-display {
        margin-bottom: 1rem;
    }

    .game-name {
        margin-bottom: 0.25rem;
    }

    .win {
        font-weight: bold;
        color: #22c55e;
        margin-bottom: 0.5rem;
    }

    .lose {
        font-weight: bold;
        color: #ef4444;
        margin-bottom: 0.5rem;
    }

    .result p {
        margin-bottom: 1rem;
    }

    .game-over-buttons {
        display: flex;
        justify-content: center;
        gap: 1rem;
    }

    .share-btn {
        font-weight: 600;
        cursor: pointer;
    }

    .audio-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .audio-controls {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .play-btn {
        font-weight: 600;
        cursor: pointer;
    }

    .play-btn:disabled {
        cursor: not-allowed;
    }

    .hint {
        margin-bottom: 1rem;
    }

    .progress-bar {
        position: relative;
        width: 100%;
        height: 0.5rem;
    }

    .progress-marker {
        position: absolute;
        width: 0.125rem;
        height: 0.5rem;
        background: var(--text-color);
    }

    .progress-fill {
        height: 0.5rem;
        background: var(--text-color);
    }

    .guess-input {
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        position: relative;
    }

    .input-wrapper {
        display: flex;
        align-items: center;
        position: relative;
    }

    .dropdown-arrow {
        position: absolute;
        right: 1rem;
        pointer-events: none;
    }

    .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 0.25rem;
        max-height: 15rem;
        overflow-y: auto;
        z-index: 10;
    }

    .dropdown-item {
        width: 100%;
        text-align: left;
        padding: 0.5rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
    }

    .dropdown-item:last-child {
        border-bottom: none;
    }

    .input-hint {
        margin-top: 0.5rem;
        margin-bottom: 0;
    }

    .guesses-list {
        margin-bottom: 1.5rem;
    }

    .guesses {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .guess-item {
        padding: 0.5rem;
        border: 1px solid;
    }

    .guess-item.correct {
        background: rgba(34, 197, 94, 0.3);
        border-color: #22c55e;
    }

    .guess-item.incorrect {
        background: rgba(239, 68, 68, 0.3);
        border-color: #ef4444;
    }

    .guess-item.empty {
        background: rgba(107, 114, 128, 0.1);
        border-color: #d1d5db;
        opacity: 0.5;
    }

    .guess-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .skip-btn {
        margin-top: 0.5rem;
    }
</style>
