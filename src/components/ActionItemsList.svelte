<script lang="ts">
    import {
        linkChanger,
        removeTitleDescriptionDuplicates,
    } from "../server/rss";
    import { actionItemsRef } from "../store/actionsState";
    import linkifyHtml from "linkify-html";
    import { clientHTMLPurify } from "./dompurifyclient";
</script>

<ul>
    {#each $actionItemsRef as item, index}
        <li class={`actionItem actionItem${index}`}>
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
                {#await clientHTMLPurify(linkifyHtml(item.description), `.actionItem${index}`)}
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
