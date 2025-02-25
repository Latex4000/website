<script lang="ts">
    import {
        emotionColours,
        type MainEmotion,
        type SensationList,
    } from "./SensationsType";

    // Props passed from the parent.
    let {
        currentYear,
        currentMonth,
        selectDate,
        sensationsList,
    }: {
        currentYear: number;
        currentMonth: number;
        selectDate: (event: { date: Date }) => void;
        sensationsList: SensationList[];
    } = $props();

    // Determine the number of days in the current month.
    let daysInMonth = $derived(
        new Date(currentYear, currentMonth + 1, 0).getDate(),
    );
    let days = $derived.by(() => {
        let days = [];
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    });

    // Create a reactive mapping from day to entry count.
    const dayCounts: Record<number, { count: number; colour: string }> =
        $derived.by(() => {
            const entries = [...sensationsList];
            const dayCountsWithColArr: Record<
                number,
                { count: number; colour: [number, number, number][] }
            > = {};
            entries.forEach((entry) => {
                const entryDate = new Date(entry.date);
                if (
                    entryDate.getFullYear() === currentYear &&
                    entryDate.getMonth() === currentMonth
                ) {
                    const day = entryDate.getDate();
                    if (dayCountsWithColArr[day]) {
                        dayCountsWithColArr[day].count += 1;
                        dayCountsWithColArr[day].colour.push(
                            emotionColours[entry.mainEmotion as MainEmotion] ??
                                emotionColours.other,
                        );
                    } else {
                        dayCountsWithColArr[day] = {
                            count: 1,
                            colour: [
                                emotionColours[
                                    entry.mainEmotion as MainEmotion
                                ] ?? emotionColours.other,
                            ],
                        };
                    }
                }
            });

            // Make the average colour for each day
            return Object.fromEntries(
                Object.entries(dayCountsWithColArr).map(
                    ([day, { count, colour }]) => {
                        return [
                            day,
                            {
                                count,
                                colour: colour
                                    .reduce<[number, number, number]>(
                                        (acc, c) => {
                                            const [r, g, b] = c;
                                            // Check if values are numbers
                                            if (
                                                r &&
                                                g &&
                                                b &&
                                                !isNaN(r) &&
                                                !isNaN(g) &&
                                                !isNaN(b)
                                            ) {
                                                acc[0] += r;
                                                acc[1] += g;
                                                acc[2] += b;
                                            }
                                            return acc;
                                        },
                                        [0, 0, 0],
                                    )
                                    .map((c) => Math.round(c / colour.length))
                                    .join(","),
                            },
                        ];
                    },
                ),
            );
        });

    function selectDay(day: number) {
        const selectedDate = new Date(currentYear, currentMonth, day);
        selectDate({ date: selectedDate });
    }
</script>

<div class="calendar">
    <div class="grid">
        {#each days as day}
            <div
                class="day"
                tabindex="0"
                role="button"
                aria-pressed="false"
                onclick={() => selectDay(day)}
                onkeydown={(e) => e.key === "Enter" && selectDay(day)}
            >
                <span>{day}</span>
                {#if dayCounts[day]}
                    <span
                        class="badge"
                        style="background-color: rgb({dayCounts[day].colour})"
                    >
                        {dayCounts[day].count}
                    </span>
                {/if}
            </div>
        {/each}
    </div>
</div>

<style>
    .calendar {
        padding: 1rem;
    }
    .grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 0.5rem;
    }
    .day {
        border: var(--border-thickness) solid #ccc;
        padding: 0.5rem;
        text-align: center;
        cursor: pointer;
        position: relative;
    }
    .badge {
        position: absolute;
        top: 2px;
        right: 2px;
        color: white;
        border-radius: 50%;
        font-size: 0.5rem;
        width: 1rem;
        height: 1rem;
    }
</style>
