<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    interface Message {
        id: number;
        username: string;
        message: string;
        createdAt: string;
    }

    let messages = $state<Message[]>([]);
    let username = $state("");
    let message = $state("");
    let error = $state<string | null>(null);
    let isSending = $state(false);
    let messagesContainer: HTMLDivElement;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let shouldAutoScroll = $state(true);

    async function fetchMessages(): Promise<void> {
        try {
            const response = await fetch("/api/omarcord/messages");
            if (!response.ok) {
                throw new Error("Failed to fetch messages");
            }

            const data: { messages: Message[] } = await response.json();
            const wasAtBottom = isScrolledToBottom();
            messages = data.messages;
            
            if (wasAtBottom || shouldAutoScroll) {
                setTimeout(scrollToBottom, 0);
            }
        } catch (err) {
            console.error(err);
            error = "Failed to load messages";
        }
    }

    function isScrolledToBottom(): boolean {
        if (!messagesContainer) return true;
        const threshold = 100;
        return (
            messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < threshold
        );
    }

    function scrollToBottom(): void {
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    async function sendMessage(): Promise<void> {
        if (!username.trim() || !message.trim() || isSending) {
            return;
        }

        isSending = true;
        error = null;

        try {
            const response = await fetch("/api/omarcord/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: username.trim(),
                    message: message.trim(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to send message");
            }

            message = "";
            shouldAutoScroll = true;
            await fetchMessages();
        } catch (err) {
            console.error(err);
            error = err instanceof Error ? err.message : "Failed to send message";
        } finally {
            isSending = false;
        }
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    function handleScroll(): void {
        shouldAutoScroll = isScrolledToBottom();
    }

    function formatTime(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    onMount(() => {
        fetchMessages();
        pollInterval = setInterval(fetchMessages, 3000);
    });

    onDestroy(() => {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
    });
</script>

<div class="omarcord">
    <div class="omarcord__header">
        <h3># omarcord</h3>
        <p class="omarcord__description">A Discord-like chat for everyone visiting this page</p>
    </div>

    <div class="omarcord__messages" bind:this={messagesContainer} onscroll={handleScroll}>
        {#if messages.length === 0}
            <div class="omarcord__empty">
                <p>No messages yet. Be the first to say something!</p>
            </div>
        {:else}
            {#each messages as msg (msg.id)}
                <div class="omarcord__message">
                    <div class="omarcord__message-header">
                        <span class="omarcord__username">{msg.username}</span>
                        <span class="omarcord__timestamp">{formatTime(msg.createdAt)}</span>
                    </div>
                    <div class="omarcord__message-content">{msg.message}</div>
                </div>
            {/each}
        {/if}
    </div>

    <div class="omarcord__input-container">
        {#if error}
            <div class="omarcord__error">{error}</div>
        {/if}
        <div class="omarcord__input-row">
            <input
                type="text"
                class="omarcord__username-input"
                placeholder="Username"
                bind:value={username}
                maxlength="50"
                disabled={isSending}
            />
            <input
                type="text"
                class="omarcord__message-input"
                placeholder="Type a message... (Press Enter to send)"
                bind:value={message}
                onkeydown={handleKeydown}
                maxlength="2000"
                disabled={isSending}
            />
            <button
                class="omarcord__send-button"
                onclick={sendMessage}
                disabled={isSending || !username.trim() || !message.trim()}
            >
                Send
            </button>
        </div>
    </div>
</div>

<style>
    .omarcord {
        display: flex;
        flex-direction: column;
        height: 80vh;
        min-height: 500px;
        max-width: 1200px;
        margin: 0 auto;
        border: 1px solid var(--text-color, currentColor);
        background: var(--background-color, #fff);
    }

    .omarcord__header {
        padding: 1rem;
        border-bottom: 1px solid var(--text-color, currentColor);
    }

    .omarcord__header h3 {
        margin: 0 0 0.25rem 0;
        font-size: 1.25rem;
    }

    .omarcord__description {
        margin: 0;
        font-size: 0.875rem;
        opacity: 0.7;
    }

    .omarcord__messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .omarcord__empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        opacity: 0.5;
    }

    .omarcord__message {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .omarcord__message-header {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
    }

    .omarcord__username {
        font-weight: 600;
        color: var(--text-color-alt, #666);
    }

    .omarcord__timestamp {
        font-size: 0.75rem;
        opacity: 0.5;
    }

    .omarcord__message-content {
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    .omarcord__input-container {
        border-top: 1px solid var(--text-color, currentColor);
        padding: 1rem;
    }

    .omarcord__error {
        background: #ff000020;
        color: #ff0000;
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
    }

    .omarcord__input-row {
        display: flex;
        gap: 0.5rem;
    }

    .omarcord__username-input {
        flex: 0 0 150px;
        padding: 0.5rem;
        border: 1px solid var(--text-color, currentColor);
        background: var(--background-color, #fff);
        color: var(--text-color, #000);
        font-family: inherit;
        font-size: 1rem;
    }

    .omarcord__message-input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid var(--text-color, currentColor);
        background: var(--background-color, #fff);
        color: var(--text-color, #000);
        font-family: inherit;
        font-size: 1rem;
    }

    .omarcord__send-button {
        padding: 0.5rem 1rem;
        border: 1px solid var(--text-color, currentColor);
        background: var(--text-color, #000);
        color: var(--background-color, #fff);
        font-family: inherit;
        font-size: 1rem;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .omarcord__send-button:hover:not(:disabled) {
        opacity: 0.8;
    }

    .omarcord__send-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .omarcord__username-input:focus,
    .omarcord__message-input:focus {
        outline: 2px solid var(--text-color-alt, #666);
        outline-offset: -2px;
    }

    @media (max-width: 600px) {
        .omarcord {
            height: 70vh;
        }

        .omarcord__input-row {
            flex-direction: column;
        }

        .omarcord__username-input {
            flex: 1;
        }

        .omarcord__send-button {
            width: 100%;
        }
    }
</style>
