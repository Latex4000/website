<script lang="ts">
    import type { InferSelectModel } from "drizzle-orm";
    import type { Tunicwild } from "../../database/schema";

    type SongData = Pick<
        InferSelectModel<typeof Tunicwild>,
        "composer" | "game" | "id" | "officialLink" | "title"
    >;

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

    let songData = $state() as SongData & { audioUrl: string };
    let guesses: ({ title: string; game: string } | false)[] = $state([]); // False for skips
    let currentGuess = $state("");
    let error = $state("");
    let gameWon = $state(false);
    let gameLost = $state(false);
    let isPlaying = $state(false);
    let showDropdown = $state(false);
    let showSongList = $state(false);
    // svelte-ignore non_reactive_update
    let audioElement: HTMLAudioElement;

    const maxGuesses = 6;
    const clipLengths = [1, 2, 4, 8, 16, 32];
    const gameHintAfter = 3;

    const showGameHint = $derived(guesses.length >= gameHintAfter && !gameWon);

    const filterProperties = ["title", "game", "composer"] as const;
    const filteredSongs = $derived(
        currentGuess.trim().length >= 2
            ? songList
                  .filter((song) =>
                      filterProperties.some((property) =>
                          song[property]
                              .toLowerCase()
                              .includes(currentGuess.trim().toLowerCase()),
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
        if (currentGuess.trim()) showDropdown = true;
        else showDropdown = false;
    });

    getSongData()
        .then((value) => (songData = value))
        .catch((err) => {
            console.error("Failed to fetch song data:", err);
            error = `${err.message}`;
        });

    function getSongData(): Promise<SongData & { audioUrl: string }> {
        const adjustedTimestamp =
            Date.now() - new Date().getTimezoneOffset() * 60 * 1000;

        return fetch(
            `/api/tunicwilds/today?timestamp=${adjustedTimestamp}`,
        ).then((response) => response.json());
    }

    function playClip() {
        if (audioElement && !gameLost && !gameWon) {
            const duration =
                clipLengths[guesses.length] ||
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
    }

    function pauseClip() {
        if (audioElement) {
            audioElement.pause();
            isPlaying = false;
        }
    }

    function selectSong(songTitle: string) {
        currentGuess = songTitle;
        showDropdown = false;
        handleGuess(songTitle);
    }

    function skipGuess() {
        if (gameWon || gameLost) return;

        guesses = [...guesses, false]; // Add a skip
        currentGuess = "";
        showDropdown = false;

        if (guesses.length >= maxGuesses) {
            gameLost = true;
            isPlaying = false;
        }
    }

    function handleGuess(guessedSong = currentGuess) {
        if (!guessedSong.trim() || gameWon || gameLost) return;

        const validSong = songList.find(
            (song) =>
                song.title.toLowerCase() === guessedSong.toLowerCase().trim(),
        );

        if (!validSong) return;

        guesses = [
            ...guesses,
            { title: validSong.title, game: validSong.game },
        ];

        if (validSong.title.toLowerCase() === songData.title.toLowerCase()) {
            gameWon = true;
            isPlaying = false;
        } else if (guesses.length >= maxGuesses) {
            gameLost = true;
            isPlaying = false;
        }

        currentGuess = "";
        showDropdown = false;
    }

    function shareResult() {
        const gameNumber = new Date().getDate();
        const attempts = gameWon ? guesses.length : "X";
        const squares = guesses
            .map((guess) =>
                !guess
                    ? "🖤"
                    : guess.title.toLowerCase() ===
                            songData.title.toLowerCase() &&
                        guess.game.toLowerCase() === songData.game.toLowerCase()
                      ? "💚"
                      : guess.game.toLowerCase() === songData.game.toLowerCase()
                        ? "💛"
                        : guess.title.toLowerCase() ===
                            songData.title.toLowerCase()
                          ? "💙"
                          : "💔",
            )
            .join("");

        const shareText = `Tunicwilds #${gameNumber} ${attempts}/${maxGuesses}\n\n${squares}`;

        if (navigator.share) navigator.share({ text: shareText });
        else {
            navigator.clipboard.writeText(shareText);
            alert("Results copied to clipboard!");
        }
    }

    function getCurrentClipLength() {
        return (
            clipLengths[guesses.length] || clipLengths[clipLengths.length - 1]
        );
    }

    function handleClickOutside(event: MouseEvent) {
        if (!(event.target as HTMLElement).closest(".dropdown-container"))
            showDropdown = false;

        if (!(event.target as HTMLElement).closest(".song-list-overlay"))
            showSongList = false;
    }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="container">
    <!-- Header -->
    <div class="header">
        <h1>TUNICWILDS</h1>
        <p class="subtitle">Guess the indie game song</p>
        <p class="game-info">
            Song #{new Date().getDate()} • {guesses.length}/{maxGuesses} guesses
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
                    <h3>"{songData.title}"</h3>
                    <p class="game-name">
                        from <strong>{songData.game}</strong>
                    </p>
                    <p class="composer">
                        Composed by {songData.composer}
                    </p>
                </div>

                {#if gameWon}
                    <div class="result">
                        <h2 class="win">Nice</h2>
                        <p>
                            You guessed it in {guesses.length} attempt{guesses.length !==
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

        <!-- Audio Player -->
        <div class="audio-player">
            <div class="audio-info">
                <div class="clip-info">
                    Clip length: {getCurrentClipLength()}s
                </div>
                <div class="attempt-info">
                    Attempt {guesses.length + 1} of {maxGuesses}
                </div>
            </div>

            <div class="audio-controls">
                <button
                    onclick={isPlaying ? pauseClip : playClip}
                    disabled={gameWon || gameLost}
                    class="play-btn"
                >
                    {isPlaying ? "⏸️ Pause" : "▶️ Play"}
                </button>
            </div>

            <!-- Game Hint -->
            {#if showGameHint && !gameWon && !gameLost}
                <div class="hint">
                    💡 <strong>Hint:</strong> This song is from
                    <strong>{songData.game}</strong>
                </div>
            {/if}

            <!-- Progress bar -->
            <div class="progress-bar">
                <div
                    class="progress-fill"
                    style="width: {(guesses.length / maxGuesses) * 100}%"
                ></div>
            </div>

            <audio bind:this={audioElement} preload="auto">
                <source src={songData.audioUrl} type="audio/mp3" />
            </audio>
        </div>

        <!-- Guess Input with Autocomplete -->
        {#if !gameWon && !gameLost}
            <div class="guess-input dropdown-container">
                <div class="input-wrapper">
                    <input
                        type="text"
                        bind:value={currentGuess}
                        onfocus={() =>
                            currentGuess.trim() && (showDropdown = true)}
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
                                onclick={() => selectSong(song.title)}
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

                <p class="input-hint">
                    You must select from the autocomplete suggestions
                </p>

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

        <!-- Guesses List -->
        {#if guesses.length > 0}
            <div class="guesses-list">
                <h3>Your Guesses:</h3>
                <div class="guesses">
                    {#each guesses as guess, index}
                        {@const isCorrect =
                            guess &&
                            guess.title.toLowerCase() ===
                                songData.title.toLowerCase()}
                        {@const guessedSong = songList.find(
                            (song) =>
                                guess &&
                                guess.title.toLowerCase() ===
                                    song.title.toLowerCase(),
                        )}

                        <div
                            class="guess-item {isCorrect
                                ? 'correct'
                                : 'incorrect'}"
                        >
                            <div class="guess-content">
                                <div>
                                    <div class="guess-title">{guess}</div>
                                    {#if guessedSong}
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
        {/if}
    {/if}
</div>

<style>
    .container {
        min-height: 100vh;
        padding: 2rem 1rem;
        max-width: 42rem;
        margin: 0 auto;
    }

    .header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .header h1 {
        margin-bottom: 0.5rem;
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
        backdrop-filter: blur(10px);
        padding: 1.5rem;
        text-align: center;
        margin-bottom: 1.5rem;
    }

    .answer-display {
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .answer-display h3 {
        font-weight: bold;
        margin-bottom: 0.25rem;
    }

    .game-name {
        margin-bottom: 0.25rem;
    }

    .win {
        font-size: 1.5rem;
        font-weight: bold;
        color: #22c55e;
        margin-bottom: 0.5rem;
    }

    .lose {
        font-size: 1.5rem;
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
        padding: 0.75rem 1.5rem;
        font-weight: 600;
        cursor: pointer;
    }

    .audio-player {
        backdrop-filter: blur(10px);
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
        padding: 0.75rem;
        margin-bottom: 1rem;
    }

    .progress-bar {
        width: 100%;
        height: 0.5rem;
    }

    .progress-fill {
        height: 0.5rem;
    }

    .guess-input {
        backdrop-filter: blur(10px);
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        position: relative;
    }

    .input-wrapper {
        display: flex;
        align-items: center;
        position: relative;
    }

    .input-wrapper input {
        flex: 1;
        padding: 0.75rem 1rem;
        outline: none;
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
        padding: 0.75rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
    }

    .dropdown-item:last-child {
        border-bottom: none;
    }

    .song-title {
        font-weight: 500;
    }

    .input-hint {
        font-size: 0.75rem;
        margin-top: 0.5rem;
        margin-bottom: 0;
    }

    .guesses-list {
        backdrop-filter: blur(10px);
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }

    .guesses-list h3 {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .guesses {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .guess-item {
        padding: 0.75rem;
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

    .guess-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .guess-title {
        font-weight: 500;
    }
</style>
