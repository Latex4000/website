<script lang="ts">
    import { onMount } from "svelte";

    let online: number | null = null;
    let isError = false;

    async function fetchOnlineCount(): Promise<void> {
        try {
            const response = await fetch("/api/analytics/online-count");
            if (!response.ok) {
                throw new Error("Failed to fetch online count");
            }

            const data: { online?: number } = await response.json();
            online = typeof data.online === "number" ? data.online : 0;
            isError = false;
        } catch (error) {
            console.error(error);
            isError = true;
        }
    }

    onMount(() => {
        fetchOnlineCount();
        const interval = setInterval(fetchOnlineCount, 30000);
        return () => clearInterval(interval);
    });

    $: label = isError
        ? "online status unavailable"
        : online == null
          ? "loading online status..."
          : `${online} ${online === 1 ? "person" : "people"} online`;
</script>

<span class="online-counter" aria-live="polite">{label}</span>

<style>
    .online-counter {
        font-size: 0.9em;
        color: var(--text-color-alt);
        white-space: nowrap;
    }
</style>
