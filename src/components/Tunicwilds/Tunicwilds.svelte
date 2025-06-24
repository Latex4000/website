<script lang="ts">
    import type { InferSelectModel } from "drizzle-orm";
    import type { Tunicwild } from "../../database/schema";

    type SongData = Pick<
        InferSelectModel<typeof Tunicwild>,
        "composer" | "game" | "id" | "officialLink" | "title"
    >;

    const date = new Date();

    const { songList }: { songList: SongData[] } = $props();
    const gameGroupedSongList = Object.groupBy(
        songList,
        (song) => song.game,
    ) as Record<string, SongData[]>;

    // server data
    let songData = $state() as Awaited<ReturnType<typeof getSongData>>;
    let currentGuess = $state({ id: -1, guess: "" });
    let error = $state("");
    let isPlaying = $state(false);
    let showDropdown = $state(false);
    let showSongList = $state(false);
    let audioElement: HTMLAudioElement | null = $state(null);
    let currentTime = $state(0);
    let animationFrameId: number | null = null;

    const maxGuesses = 6;
    const clipLengths = [0.5, 1, 2, 4, 8, 16];
    const gameHintAfter = 3;

    const guesses = $derived(songData?.session.guesses ?? []);
    const result = $derived(songData?.session.result ?? null);

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
            isPlaying = true;
            updateProgress();
        };

        const handlePause = () => {
            isPlaying = false;
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
        fourFourFiveEnabled: boolean;
        session: Required<SessionData>["tunicwilds"][string];
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
        await submitGuess(null); // Submit null for skip
        currentGuess = { id: -1, guess: "" };
        showDropdown = false;
    }

    async function handleGuess(guessedSong = currentGuess) {
        if (!guessedSong.guess.trim()) return;

        const validSong = songList.find((song) => song.id === guessedSong.id);

        if (!validSong) return;

        await submitGuess(validSong.id);
        currentGuess = { id: -1, guess: "" };
        showDropdown = false;
    }

    function playClip() {
        if (!audioElement) return;

        audioElement.currentTime = 0;
        audioElement.play();
        isPlaying = true;
    }

    function pauseClip() {
        if (!audioElement) return;
        audioElement.pause();
        isPlaying = false;
    }

    function shareResult() {
        const emojiSet = songData.fourFourFiveEnabled
            ? {
                  skip: ":charles:",
                  correct: ":onlinecharles:",
                  correctGame: ":neoyellowcharles:",
                  correctTitle: ":jamescharles:",
                  incorrect: ":redcharles:",
              }
            : {
                  skip: "🖤",
                  correct: "💚",
                  correctGame: "💛",
                  correctTitle: "💙",
                  incorrect: "💔",
              };

        const attempts = result ? guesses.length : "X";
        const squares = guesses
            .map((guess) => emojiSet[guess?.result ?? "skip"])
            .join("");

        const shareText = `Tunicwilds ${date.toLocaleDateString()} ${attempts}/${maxGuesses}\n\n${squares}`;

        if (navigator.share) navigator.share({ text: shareText });
        else {
            navigator.clipboard.writeText(shareText);
            alert("Results copied to clipboard!");
        }
    }

    function handleClickOutside(event: MouseEvent) {
        if (!(event.target as HTMLElement).closest(".dropdown-container"))
            showDropdown = false;

        if (
            !(event.target as HTMLElement).closest(".song-list-overlay") &&
            !(event.target as HTMLElement).closest(".song-list-btn")
        )
            showSongList = false;
    }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="container">
    <!-- Header -->
    <div class="header">
        <h1>TUNICWILDS</h1>
        <p class="subtitle">Guess the song from the game</p>
        <p class="game-info">
            {date.toLocaleDateString()} • {guesses.length}/{maxGuesses} guesses
        </p>
        <button
            class="song-list-btn"
            onclick={() => (showSongList = !showSongList)}
        >
            {showSongList ? "Hide Song List" : "Show Song List"}
        </button>
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
                        <h3>
                            <a href={songs[0]?.officialLink} target="_blank"
                                >{game}</a
                            >
                        </h3>
                        <ul>
                            {#each songs as song}
                                <li>
                                    {song.composer} - {song.title}
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
        {#if result != null}
            <div class="game-over">
                {#if result}
                    <div class="result">
                        <p class="win">😃 Nice</p>
                        <p>
                            You guessed it in {guesses.length}
                            {guesses.length === 1 ? "try" : "tries"}!
                        </p>
                    </div>
                {:else}
                    <div class="result">
                        <p class="lose">😔 Game Over</p>
                        <p>Better luck next time!</p>
                    </div>
                {/if}

                <a
                    class="answer-display {result ? 'win' : 'lose'}"
                    href={songData.tunicwild.officialLink}
                    target="_blank"
                >
                    <p>
                        {songData.tunicwild.composer} - "{songData.tunicwild
                            .title}"
                    </p>
                    <p class="game-name">
                        Game: <strong>{songData.tunicwild.game}</strong>
                    </p>
                </a>

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
                    {@const guess = guesses[index]}
                    {@const guessedSong = songList.find(
                        (song) => song.id === guess?.id,
                    )}

                    <div
                        class={[
                            "guess-item",
                            `guess-item--${guess === undefined ? "empty" : (guess?.result ?? "skip")}`,
                        ]}
                    >
                        <div class="guess-content">
                            {#if guessedSong != null}
                                <a
                                    class="guess-title"
                                    href={guessedSong.officialLink}
                                    >{guessedSong.composer} - "{guessedSong.title}"
                                    ({guessedSong.game})</a
                                >
                            {:else}
                                <div class="guess-title">
                                    {guess === undefined
                                        ? "—"
                                        : guess == null
                                          ? "Skipped"
                                          : "Song unavailable"}
                                </div>
                            {/if}
                            <span class="clip-duration">
                                {clipLengths[index]}s
                            </span>
                        </div>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Audio Player -->
        <div class="audio-player">
            {#if result == null}
                <div class="audio-info">
                    <div class="clip-info">
                        Clip length: {clipLengths[guesses.length]}s
                    </div>
                    <div class="attempt-info">
                        Attempt {guesses.length + 1} of {maxGuesses}
                    </div>
                </div>
            {/if}

            <div class="audio-controls">
                <button
                    onclick={isPlaying ? pauseClip : playClip}
                    class="play-btn"
                >
                    {isPlaying ? "⏸️ Pause" : "▶️ Play"}
                </button>
            </div>

            <!-- Game Hint -->
            {#if guesses.length >= gameHintAfter && songData.tunicwild.game && result == null}
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
                        style="left: {(length / 16) * 100}%"
                    ></div>
                {/each}
                <div
                    class="progress-fill"
                    style="width: {(currentTime / 16) * 100}%"
                ></div>
            </div>

            <audio bind:this={audioElement} preload="auto">
                <source src={songData.tunicwild.audioUrl} type="audio/mp3" />
            </audio>
        </div>

        <!-- Guess Input with Autocomplete -->
        {#if result == null}
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
                                <div class="song-title">
                                    {song.composer} - "{song.title}" ({song.game})
                                </div>
                            </button>
                        {/each}
                    </div>
                {/if}

                <!-- Skip -->
                <button onclick={skipGuess} class="skip-btn">Skip</button>
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
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        padding: 2rem;
        background: color-mix(
            in srgb,
            var(--background-color) 90%,
            transparent
        );
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .game-over {
        text-align: center;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .answer-display {
        padding: 0.5rem;
        margin-bottom: 1rem;
        width: max-content;
        text-decoration: none;
    }

    .answer-display:hover {
        text-decoration: underline;
    }

    .game-name {
        margin-bottom: 0.25rem;
    }

    .win,
    .lose {
        font-size: 1.25rem;
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

    .guess-item--correct,
    .answer-display.win {
        background: rgba(34, 197, 94, 0.3);
        border-color: rgb(34, 197, 94);
    }

    .guess-item--correctGame {
        background: rgba(231, 220, 65, 0.3);
        border-color: rgb(231, 220, 65);
    }

    .guess-item--correctTitle {
        background: rgba(65, 131, 231, 0.3);
        border-color: rgb(65, 131, 231);
    }

    .guess-item--incorrect,
    .answer-display.lose {
        background: rgba(239, 68, 68, 0.3);
        border-color: rgb(239, 68, 68);
    }

    .guess-item--skip {
        background: rgba(107, 114, 128, 0.1);
        border-color: rgb(209, 213, 219);
    }

    .guess-item--empty {
        background: rgba(107, 114, 128, 0.1);
        border-color: rgb(209, 213, 219);
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
