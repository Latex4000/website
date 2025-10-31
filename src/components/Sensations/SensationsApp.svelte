<script lang="ts">
    import { onMount } from "svelte";
    import Calendar from "./SensationsCalendar.svelte";
    import EntryEditor from "./SensationsEntry.svelte";
    import DataButtons from "./SensationsDataButtons.svelte";
    import LZString from "lz-string";
    import {
        exampleSensationLists,
        isSensationListArray,
        type SensationList,
    } from "./SensationsType";

    let sensationsList: SensationList[] = [];

    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-indexed
    let firstDayOfWeek = "0"; // Sunday
    let selectedDate: Date = new Date();
    let editingEntry: SensationList | null = null;
    let dayEntries: SensationList[] = [];
    let showEditor = false;
    let showExample = false;

    const STORAGE_KEY = "sensations_data";
    const FIRST_DAY_OF_WEEK_KEY = "sensations_first_dow";

    // Load data from localStorage on mount.
    onMount(() => {
        const storedFirstDOW = localStorage.getItem(FIRST_DAY_OF_WEEK_KEY);
        if (
            storedFirstDOW &&
            !isNaN(Number(storedFirstDOW)) &&
            Number(storedFirstDOW) >= 0 &&
            Number(storedFirstDOW) <= 6
        )
            firstDayOfWeek = storedFirstDOW;

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const decompressed = LZString.decompress(stored);
            if (decompressed) {
                try {
                    const data = JSON.parse(decompressed);
                    sensationsList = data;
                } catch (e) {
                    console.error("Error parsing stored data", e);
                }
            }
        }

        updateDayEntries();
    });

    function importList() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                const contents = event.target?.result;
                if (!contents) return;

                try {
                    const data = JSON.parse(contents as string);
                    if (Array.isArray(data) && isSensationListArray(data)) {
                        sensationsList = data;
                        updateDayEntries();
                    } else {
                        console.error("Invalid data format");
                    }
                } catch (e) {
                    console.error("Error parsing imported data", e);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    function deleteList() {
        if (
            confirm(
                "Are you sure you want to delete all data? This action cannot be undone, and will remove all entries, including those from other days.",
            )
        ) {
            sensationsList = [];
            localStorage.removeItem(STORAGE_KEY);
            dayEntries = [];
        }
    }

    function updateDayEntries() {
        const allEntries = [...sensationsList];
        const json = JSON.stringify(allEntries);
        const compressed = LZString.compress(json);
        localStorage.setItem(STORAGE_KEY, compressed);

        dayEntries = allEntries.filter((entry) => {
            const entryDate = new Date(entry.date);
            return (
                entryDate.getFullYear() === selectedDate.getFullYear() &&
                entryDate.getMonth() === selectedDate.getMonth() &&
                entryDate.getDate() === selectedDate.getDate()
            );
        });

        dayEntries.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
    }

    function handleSelectDay(event: { date: Date }) {
        selectedDate = event.date;
        editingEntry = null;
        showEditor = false;
        updateDayEntries();
    }

    function createNewEntry() {
        editingEntry = null; // New entry mode.
        showEditor = true;
        showExample = false;
    }

    function seeExampleEntry() {
        const examples = exampleSensationLists();
        const exampleSelected =
            examples[Math.floor(Math.random() * examples.length)]!;
        editingEntry = exampleSelected;
        showEditor = true;
        showExample = true;
    }

    function handleSave(event: { entry: SensationList }) {
        const entry = event.entry;
        let data = [...sensationsList];
        const index = data.findIndex((e) => e.id === entry.id);
        if (index !== -1) data[index] = entry;
        else data.push(entry);
        sensationsList = [...data];
        showEditor = false;
        updateDayEntries();
    }

    function handleDelete(event: { id: number }) {
        const id = event.id;
        let data = [...sensationsList];
        data = data.filter((e) => e.id !== id);
        sensationsList = [...data];
        showEditor = false;
        updateDayEntries();
    }

    function editEntry(entry: SensationList) {
        editingEntry = entry;
        showEditor = true;
        showExample = false;
    }

    function prevMonth() {
        if (currentMonth === 0) {
            currentMonth = 11;
            currentYear -= 1;
        } else currentMonth -= 1;
    }

    function nextMonth() {
        if (currentMonth === 11) {
            currentMonth = 0;
            currentYear += 1;
        } else currentMonth += 1;
    }
</script>

<div class="app">
    <div class="calendar-container">
        <div class="calendar-nav">
            <button onclick={prevMonth}>&lt; Prev</button>
            <h2 class="calendar-title">
                {new Date(currentYear, currentMonth).toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                })}
            </h2>
            <button onclick={nextMonth}>Next &gt;</button>
        </div>
        <div class="firstDOW">
            <label for="firstDOW">First day of the week:</label>
            <select
                id="firstDOW"
                bind:value={firstDayOfWeek}
                onchange={() =>
                    localStorage.setItem(FIRST_DAY_OF_WEEK_KEY, firstDayOfWeek)}
            >
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
            </select>
        </div>
        <Calendar
            {currentYear}
            {currentMonth}
            {sensationsList}
            firstDayOfWeek={Number(firstDayOfWeek)}
            selectDate={handleSelectDay}
        />
    </div>

    <div class="day-entries">
        <h3>Entries for {selectedDate.toDateString()}</h3>
        <button onclick={createNewEntry}>+ New Entry</button>
        <button onclick={seeExampleEntry}>Example Entry</button>
        {#if dayEntries.length === 0}
            <p>No entries for this day.</p>
        {:else}
            {#each dayEntries as entry}
                <div
                    class="entry"
                    tabindex="0"
                    role="button"
                    aria-pressed="false"
                    onclick={() => editEntry(entry)}
                    onkeydown={(e) => e.key === "Enter" && editEntry(entry)}
                >
                    <strong>{entry.mainEmotion}</strong> – {new Date(
                        entry.date,
                    ).toLocaleTimeString()}
                </div>
            {/each}
        {/if}
    </div>

    {#if showEditor}
        <EntryEditor
            {showExample}
            entry={editingEntry}
            date={selectedDate}
            save={handleSave}
            deleteEntry={handleDelete}
            cancel={() => (showEditor = showExample = false)}
        />
    {/if}

    <div class="export-section">
        <DataButtons {sensationsList} {importList} {deleteList} />
    </div>
</div>

<style>
    .app {
        display: flex;
        flex-direction: column;
        gap: var(--space-static-md);
    }
    .calendar-container {
        border: var(--border-thickness) solid var(--border-color-muted);
        padding: var(--space-static-md);
    }
    .calendar-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-static-md);
    }
    .calendar-title {
        margin: 0;
    }
    .day-entries {
        border: var(--border-thickness) solid var(--border-color-muted);
        padding: var(--space-static-md);
    }
    .entry {
        cursor: pointer;
        padding: var(--space-static-xs);
        border-bottom: var(--border-thickness-thin) solid
            var(--border-color-muted);
    }
    .entry:hover {
        background: var(--background-color-alt);
    }
    .export-section {
        margin-top: var(--space-static-md);
        text-align: center;
    }
</style>
