<script lang="ts">
    import {
        linkChanger,
        removeTitleDescriptionDuplicates,
    } from "../server/rss";
    import { actionItemsRef } from "../store/actionsState";
</script>

<ul>
    {#each $actionItemsRef as item}
        <li class="actionItem">
            <a href={linkChanger(item.url, item.action.type)}>
                <strong>{item.action.username} - {item.action.type}</strong>
                {#if item.title}
                    {removeTitleDescriptionDuplicates(
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
