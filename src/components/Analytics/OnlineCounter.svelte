<script lang="ts">
    import { onMount } from "svelte";

    const { initialCount }: { initialCount: number | null } = $props();

    let online = $state(initialCount);

    async function fetchOnlineCount(): Promise<void> {
        try {
            const response = await fetch("/api/analytics/online-count");
            if (!response.ok) {
                throw new Error("Failed to fetch online count");
            }

            const data: { online?: number } = await response.json();
            online = typeof data.online === "number" ? data.online : 0;
        } catch (error) {
            console.error(error);
            online = null;
        }
    }

    onMount(() => {
        if (online == null) {
            fetchOnlineCount();
        }

        const interval = setInterval(fetchOnlineCount, 30000);
        return () => clearInterval(interval);
    });

    let label = $derived(
        online == null
            ? "online status unavailable"
            : `${online} ${online === 1 ? "person" : "people"} online`,
    );
</script>

<span class="online-counter" aria-live="polite">{label}</span>

<style>
    .online-counter {
        font-size: 0.9em;
        color: var(--text-color-alt);
        white-space: nowrap;
    }
</style>
