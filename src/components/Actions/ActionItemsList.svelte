<script lang="ts">
    import {
        linkChanger,
        removeTitleDescriptionDuplicates,
        twitterImageReplacer,
    } from "../../server/rss";
    import { actionItemsRef } from "../../store/actionsState";
    import linkifyHtml from "linkify-html";
    import { clientHTMLPurify } from "../DOMPurify/client";

    let actionItemCount = $derived($actionItemsRef.length);
</script>

<ul
    id={"action-items-feed"}
    role="feed"
    aria-live="polite"
    aria-label="Latest actions"
    aria-busy={$actionItemsRef.length === 0 ? "true" : "false"}
>
    {#each $actionItemsRef as item, index}
        <li
            class={`actionItem actionItem${index}`}
            role="article"
            aria-posinset={index + 1}
            aria-setsize={actionItemCount}
        >
            <strong>
                <a href={linkChanger(item.url, item.action.type)}
                    >{item.action.username} - {item.action.type}
                </a>
            </strong>
            {#if item.title}
                {removeTitleDescriptionDuplicates(
                    item.title,
                    item.description,
                    item.action.type,
                )}
            {/if}
            <br /> <br />
            {#if item.description}
                {#await clientHTMLPurify(linkifyHtml(twitterImageReplacer(item.description)), `.actionItem${index}`)}
                    <p>Loading...</p>
                {:then sanitizedDescription}
                    {@html sanitizedDescription}
                {:catch error}
                    <p>{error.message}</p>
                {/await}
            {/if}
            <br />
            <small>Date: {item.date.toLocaleString()}</small>
        </li>
    {/each}
</ul>

<style>
    .actionItem {
        margin: 0;
        color: var(--text-color-alt);
        margin-bottom: calc(2 * var(--line-height));
    }

    .actionItem a {
        text-decoration: none;
        color: var(--text-color);
    }

    .actionItem a:hover {
        text-decoration: underline;
    }
</style>
