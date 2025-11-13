<script lang="ts">
    import {
        mainEmotions,
        subEmotions,
        type MainEmotion,
        type SensationList,
        emotionColours,
    } from "./SensationsType";

    // If editing an existing entry, the `entry` prop is passed in; if not, a new entry is created.
    let {
        showExample,
        entry,
        date,
        save,
        deleteEntry,
        cancel,
    }: {
        showExample: boolean;
        entry: SensationList | null;
        date: Date;
        save: (entry: { entry: SensationList }) => void;
        deleteEntry: (entry: { id: number }) => void;
        cancel: () => void;
    } = $props();

    let id: number = entry ? entry.id : Date.now();
    let core: string = $state(entry ? entry.causes.core.join("\n") : "");
    let preConds: string = $state(
        entry ? entry.causes.preConds.join("\n") : "",
    );
    let history: string = $state(entry ? entry.causes.history.join("\n") : "");
    let energy: "low" | "medium" | "high" = $state(
        entry ? entry.effects.energy : "medium",
    );
    let physical: string = $state(
        entry ? entry.effects.physical.join("\n") : "",
    );
    let mental: string = $state(entry ? entry.effects.mental.join("\n") : "");
    let helpful: string = $state(
        entry ? entry.possibleResponses.helpful.join("\n") : "",
    );
    let harmful: string = $state(
        entry ? entry.possibleResponses.harmful.join("\n") : "",
    );
    let neutral: string = $state(
        entry ? entry.possibleResponses.neutral.join("\n") : "",
    );

    let mainEmotion: MainEmotion | "other" = $state(
        entry && mainEmotions.includes(entry.mainEmotion as MainEmotion)
            ? (entry.mainEmotion as MainEmotion)
            : "enjoyment",
    );
    // If entry.mainEmotion is not one of the predefined ones, fill customMainEmotion.
    let customMainEmotion: string = $state(
        entry && !mainEmotions.includes(entry.mainEmotion as MainEmotion)
            ? (entry.mainEmotion as MainEmotion)
            : "",
    );
    let subEmotion: string = $state(entry ? entry.subEmotion.join(", ") : "");

    // Update state if entry changes.
    $effect(() => {
        if (entry) {
            id = entry.id;
            core = entry.causes.core.join("\n");
            preConds = entry.causes.preConds.join("\n");
            history = entry.causes.history.join("\n");
            energy = entry.effects.energy;
            physical = entry.effects.physical.join("\n");
            mental = entry.effects.mental.join("\n");
            helpful = entry.possibleResponses.helpful.join("\n");
            harmful = entry.possibleResponses.harmful.join("\n");
            neutral = entry.possibleResponses.neutral.join("\n");
            mainEmotion = mainEmotions.includes(
                entry.mainEmotion as MainEmotion,
            )
                ? (entry.mainEmotion as MainEmotion)
                : "other";
            customMainEmotion = !mainEmotions.includes(
                entry.mainEmotion as MainEmotion,
            )
                ? (entry.mainEmotion as MainEmotion)
                : "";
            subEmotion = entry.subEmotion.join(", ");
        } else {
            id = Date.now();
            core = "";
            preConds = "";
            history = "";
            energy = "medium";
            physical = "";
            mental = "";
            helpful = "";
            harmful = "";
            neutral = "";
            mainEmotion = "enjoyment";
            customMainEmotion = "";
            subEmotion = "";
        }
    });

    function saveEntry(e: Event) {
        e.preventDefault();
        const effectiveMainEmotion =
            mainEmotion === "other" ? customMainEmotion : mainEmotion;
        const newEntry: SensationList = {
            id,
            date: date.toISOString(),
            causes: {
                core: core.split("\n").filter((s) => s.trim() !== ""),
                preConds: preConds.split("\n").filter((s) => s.trim() !== ""),
                history: history.split("\n").filter((s) => s.trim() !== ""),
            },
            effects: {
                energy,
                physical: physical.split("\n").filter((s) => s.trim() !== ""),
                mental: mental.split("\n").filter((s) => s.trim() !== ""),
            },
            possibleResponses: {
                helpful: helpful.split("\n").filter((s) => s.trim() !== ""),
                harmful: harmful.split("\n").filter((s) => s.trim() !== ""),
                neutral: neutral.split("\n").filter((s) => s.trim() !== ""),
            },
            mainEmotion: effectiveMainEmotion,
            subEmotion: subEmotion
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s !== ""),
        };
        save({ entry: newEntry });
    }

    // Compute feedback blends based on the selected emotion.
    let currentColor: [number, number, number] = $derived.by(() =>
        mainEmotion === "other"
            ? emotionColours.other
            : emotionColours[mainEmotion],
    );
    const currentColorCss = $derived.by(
        () => `rgb(${currentColor[0]}, ${currentColor[1]}, ${currentColor[2]})`,
    );
    const emotionBackground = $derived.by(
        () =>
            `color-mix(in srgb, var(--feedback-accent) 55%, ${currentColorCss} 45%)`,
    );
    const emotionArrowColor = $derived.by(
        () =>
            `color-mix(in srgb, var(--feedback-arrow) 70%, ${currentColorCss} 30%)`,
    );
</script>

<div class="entry-editor">
    <h3>
        {showExample ? "Example Entry" : entry ? "Edit Entry" : "New Entry"} – {new Date(
            date,
        ).toLocaleString()}
        <div class="options">
            {#if !showExample}
                <button type="submit">Save</button>
                {#if entry}
                    <button type="button" onclick={() => deleteEntry({ id })}
                        >Delete</button
                    >
                {/if}
            {/if}
            <button type="button" onclick={() => cancel()}>Cancel</button>
        </div>
    </h3>
    <form onsubmit={saveEntry}>
        <div class="form-container">
            <div class="section section-causes">
                <div class="subsection preconds">
                    <div>
                        <strong>Context/Preconditions</strong>
                        <br />
                        Current circumstances/feelings; things that were happening
                        before/during the cause
                    </div>
                    <textarea
                        bind:value={preConds}
                        placeholder="Current circumstances and feelings"
                    ></textarea>
                </div>
                <div
                    class="subsection core-event"
                    style={`background-color: ${emotionBackground};`}
                >
                    <div>Core Event</div>
                    <textarea
                        bind:value={core}
                        placeholder="Major event that triggered the sensation"
                    ></textarea>
                </div>
                <div class="subsection history">
                    <div>
                        <strong>History/Things Remembered</strong>
                        <br />
                        Your worldview, past experiences, personal history, how you
                        see the world
                    </div>
                    <textarea
                        bind:value={history}
                        placeholder="Your worldview, past experiences, personal history"
                    ></textarea>
                </div>
            </div>

            <div class="arrow arrow-1" style={`color: ${emotionArrowColor};`}>
                <span>➜</span>
            </div>

            <div class="section section-reactions">
                <div class="reaction physical">
                    <div>
                        <strong>Physical Sensations</strong>
                        <br />
                        Your automatic bodily sensations/reactions to the event
                    </div>
                    <textarea
                        bind:value={physical}
                        placeholder="Physical reactions"
                    ></textarea>
                </div>
                <div
                    class="reaction major-emotion"
                    style={`background-color: ${emotionBackground};`}
                >
                    <div>Major Emotion</div>
                    <select
                        bind:value={mainEmotion}
                        aria-label="Select Major Emotion"
                    >
                        {#each mainEmotions as emotion}
                            <option value={emotion}>{emotion}</option>
                        {/each}
                        <option value="other">Other</option>
                    </select>
                    {#if mainEmotion === "other"}
                        <input
                            type="text"
                            bind:value={customMainEmotion}
                            placeholder="Enter your emotion"
                        />
                    {/if}
                    <div>Sub-Emotions</div>
                    {#if mainEmotion !== "other"}
                        <input
                            type="text"
                            onfocus={(e) => ((e.target as any).type = "email")}
                            onblur={(e) => ((e.target as any).type = "text")}
                            list="subEmotionList"
                            bind:value={subEmotion}
                            placeholder="e.g. frustrated, anxious"
                            multiple
                        />
                        <datalist id="subEmotionList">
                            {#each subEmotions[mainEmotion] as suggestion}
                                <option value={suggestion}></option>
                            {/each}
                        </datalist>
                    {:else}
                        <input
                            type="text"
                            bind:value={subEmotion}
                            placeholder="e.g. custom sub-emotions"
                        />
                    {/if}
                    <div>Your Energy Level</div>
                    <select
                        bind:value={energy}
                        aria-label="Select Energy Level"
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <div class="reaction mental">
                    <div>
                        <strong>Mental Experiences</strong>
                        <br />
                        Immediate thoughts, beliefs, interpretations, and reactions
                        to the event
                    </div>
                    <textarea
                        bind:value={mental}
                        placeholder="Subjective, mental reactions"
                    ></textarea>
                </div>
            </div>

            <div class="arrow arrow-2" style={`color: ${emotionArrowColor};`}>
                <span>➜</span>
            </div>

            <div class="section section-responses">
                <div class="response harmful">
                    <div>
                        <strong>Harmful / Destructive Responses</strong>
                        <br />
                        Responses that are negative, damaging to you or others
                    </div>
                    <textarea
                        bind:value={harmful}
                        placeholder="Harmful responses"
                    ></textarea>
                </div>
                <div class="response helpful">
                    <div>
                        <strong>Helpful / Constructive Responses</strong>
                        <br />
                        Responses that are positive, and not damaging to you or others
                    </div>
                    <textarea
                        bind:value={helpful}
                        placeholder="Helpful responses"
                    ></textarea>
                </div>
                <div class="response neutral">
                    <div>
                        <strong>Neutral / Ambiguous Responses</strong>
                        <br />
                        Responses that you aren't sure of, or aren't clear how they
                        might affect you
                    </div>
                    <textarea
                        bind:value={neutral}
                        placeholder="Neutral responses"
                    ></textarea>
                </div>
            </div>
        </div>
    </form>
</div>

<style>
    .entry-editor {
        border: var(--border-thickness) solid var(--border-color-muted);
        padding: var(--space-static-md);
        margin-top: var(--space-static-md);
        overflow-x: scroll;
        overflow-y: hidden;
    }
    h3 {
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        left: 0;
    }
    form {
        display: flex;
        flex-direction: column;
        gap: var(--space-static-md);
        width: 300%;
        height: 100%;
    }
    form textarea {
        height: max-content;
        field-sizing: content;
    }
    .form-container {
        display: flex;
        align-items: flex-start;
        gap: var(--space-static-md);
    }
    .section {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--space-static-sm);
        height: 100%;
        justify-content: center;
    }
    .section-causes .subsection {
        display: flex;
        flex-direction: column;
    }
    .core-event {
        padding: var(--space-static-xs);
    }
    .section-reactions {
        display: flex;
        gap: var(--space-static-sm);
    }
    .section-reactions .reaction {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--space-static-xs);
    }
    .section-reactions .major-emotion {
        padding: var(--space-static-xs);
    }
    .section-responses {
        display: flex;
        flex-direction: column;
        gap: var(--space-static-sm);
    }
    .harmful,
    .helpful,
    .neutral {
        padding: var(--space-static-xs);
    }
    .harmful {
        background-color: var(--feedback-harmful);
    }
    .helpful {
        background-color: var(--feedback-helpful);
    }
    .neutral {
        background-color: var(--feedback-neutral);
    }
    .response {
        display: flex;
        flex-direction: column;
    }
    .arrow {
        font-size: calc(var(--font-size-lg) * 20 / 14);
        align-self: center;
        color: var(--feedback-arrow);
    }
    .options {
        display: flex;
        gap: var(--space-static-md);
        justify-content: flex-end;
    }
</style>
