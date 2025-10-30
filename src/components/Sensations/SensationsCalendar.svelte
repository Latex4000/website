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
        firstDayOfWeek,
    }: {
        currentYear: number;
        currentMonth: number;
        selectDate: (event: { date: Date }) => void;
        sensationsList: SensationList[];
        firstDayOfWeek: number;
    } = $props();

    // Determine the number of days in the current month.
    let daysInMonth = $derived(
        new Date(currentYear, currentMonth + 1, 0).getDate(),
    );
    let firstDate = new Date(currentYear, currentMonth, 1);
    let offset = $derived.by(
        () => (firstDate.getDay() - firstDayOfWeek + 7) % 7,
    );

    let calendarDays = $derived.by(() => {
        let daysArr = [];
        for (let i = 0; i < offset; i++) daysArr.push(null);
        for (let i = 1; i <= daysInMonth; i++) daysArr.push(i);
        return daysArr;
    });

    // Derived weekday headers array.
    let weekDayHeaders = $derived.by(() => {
        // Fixed base date for offset calculations (Jan 3, 2021 is a Sunday)
        const baseDate = new Date(2021, 0, 3);

        return Array.from({ length: 7 }, (_, i) => {
            const dayIndex = (i + firstDayOfWeek) % 7;
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() + dayIndex);
            return date.toLocaleDateString(undefined, { weekday: "short" });
        });
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

            // Compute the average colour for each day.
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
    <!-- Weekday headers -->
    <div class="weekday-headers">
        {#each weekDayHeaders as header}
            <div class="weekday">{header}</div>
        {/each}
    </div>
    <!-- Calendar grid -->
    <div class="grid">
        {#each calendarDays as day}
            {#if day}
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
                            style="background-color: rgb({dayCounts[day]
                                .colour})"
                        >
                            {dayCounts[day].count}
                        </span>
                    {/if}
                </div>
            {/if}
            {#if !day}
                <div></div>
            {/if}
        {/each}
    </div>
</div>

<style>
    .calendar {
        padding: var(--space-static-md);
    }
    .weekday-headers {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        margin-bottom: var(--space-static-xs);
    }
    .weekday {
        text-align: center;
        font-weight: bold;
    }
    .grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: var(--space-static-xs);
    }
    .day {
        border: var(--border-thickness) solid var(--border-color-muted);
        padding: var(--space-static-xs);
        text-align: center;
        cursor: pointer;
        position: relative;
    }
    .badge {
        position: absolute;
        top: calc(var(--border-thickness) * 2);
        right: calc(var(--border-thickness) * 2);
        color: white;
        border-radius: 50%;
        font-size: calc(var(--font-size-sm) * 2 / 3);
        width: var(--space-static-md);
        height: var(--space-static-md);
    }
</style>
