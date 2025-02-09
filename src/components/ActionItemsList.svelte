<script lang="ts">
    import type { FeedType } from "../server/rss";
    import { actionItemsRef } from "../store/actionsState";
    function removePartialDuplicates(
        title: string,
        description: string,
        actionType: FeedType,
    ): string {
        if (!title || !description) return title;

        if (actionType === "statuscafe") {
            const titleWords = title.split(/\s+/);
            const descWords = new Set(description.split(/\s+/));

            // Filter out words in title that also appear in description
            const filtered = titleWords.filter((word) => !descWords.has(word));

            // The end may be truncated
            return filtered.join(" ").replace(/\S*\.\.\.$/, "");
        }

        if (title.includes(description))
            return title.replace(description, "").trim();

        return title;
    }
</script>

<ul>
    {#each $actionItemsRef as item}
        <li class="actionItem">
            <a href={item.url}>
                <strong>{item.action.username} - {item.action.type}</strong>
                {#if item.title}
                    {removePartialDuplicates(
                        item.title,
                        item.description,
                        item.action.type,
                    )}
                {/if}
                <br /> <br />
                {#if item.description}
                    {item.description} <br />
                {/if}
                <br />
                <small>Date: {item.date.toLocaleString()}</small>
            </a>
        </li>
    {/each}
</ul>

<style>
    .actionItem {
        margin: 0;
        margin-bottom: calc(2 * var(--line-height));
    }

    .actionItem a {
        text-decoration: none;
        color: var(--text-color-alt);
    }

    .actionItem a:hover {
        text-decoration: underline;
    }

    .actionItem a strong {
        color: var(--text-color);
    }
</style>
