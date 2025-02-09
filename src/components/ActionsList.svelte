<script lang="ts">
    import { onMount } from "svelte";
    import {
        actionItemsRef,
        actionsRef,
        filtersRef,
        nextCursorRef,
        prevCursorRef,
        type ActionList,
    } from "../store/actionsState";
    import type { ActionItemType } from "../../db/types";

    let { actions }: { actions: ActionList[] } = $props();
    actionsRef.set(actions);

    filtersRef.set(Object.fromEntries(actions.map((row) => [row.id, true])));

    onMount(async () => await updateActionItems());

    const updateActionItems = async (dir?: "prev" | "next") => {
        const {
            things: actionItems,
            prevCursor,
            nextCursor,
        }: {
            things: ActionItemType[];
            prevCursor?: string;
            nextCursor?: string;
        } = await fetch(
            `/api/actionitems?pageSize=20&ignore=${Object.entries($filtersRef)
                .filter(([_, v]) => !v)
                .map(([k, _]) => k)
                .join(
                    ",",
                )}${dir ? `&direction=${dir}&cursor=${dir === "prev" ? $prevCursorRef : $nextCursorRef}` : ""}
                `,
        ).then((res) => res.json());
        actionItems.forEach((item) => {
            item.date = new Date(item.date);
        });
        actionItems.sort((a, b) => b.date.getTime() - a.date.getTime());

        actionItemsRef.set(
            actionItems.map((item) => ({
                ...item,
                action: $actionsRef.find(
                    (action) => action.id === item.actionID,
                )!,
            })),
        );
        prevCursorRef.set(prevCursor ? new Date(prevCursor) : undefined);
        nextCursorRef.set(nextCursor ? new Date(nextCursor) : undefined);
    };

    let actionsGroupedByUser = $derived(
        $actionsRef.reduce(
            (acc, action) => {
                acc[action.username] ??= [];
                acc[action.username]!.push(action);
                return acc;
            },
            {} as Record<string, ActionList[]>,
        ),
    );

    const onClickAction = async (actionID: number) => {
        filtersRef.setKey(actionID, !$filtersRef[actionID]);
        await updateActionItems();
    };

    const onClickUser = async (username: string) => {
        const anyTrue = actionsGroupedByUser[username]!.some(
            (action) => $filtersRef[action.id],
        );
        actionsGroupedByUser[username]!.forEach((action) =>
            filtersRef.setKey(action.id, !anyTrue),
        );
        await updateActionItems();
    };

    let expandedUsers: Record<string, boolean> = $state({});
</script>

<div class="pagination">
    {#if $prevCursorRef}
        <button onclick={() => updateActionItems("prev")}>Previous</button>
    {/if}
    {#if $nextCursorRef}
        <button onclick={() => updateActionItems("next")}>Next</button>
    {/if}
    <button onclick={() => updateActionItems()}>Reset</button>
</div>
{#each Object.entries(actionsGroupedByUser) as [username, actions]}
    <div class="actionUserHeader">
        <button
            onclick={() => (expandedUsers[username] = !expandedUsers[username])}
        >
            {username}
            <span class="triangle" class:expanded={expandedUsers[username]}>
                ▼
            </span>
        </button>
        <input
            type="checkbox"
            checked={actions.some((action) => $filtersRef[action.id])}
            onclick={() => onClickUser(username)}
        />
    </div>
    {#if expandedUsers[username]}
        <ul class="actions">
            {#each actions as action}
                <li class="action">
                    <input
                        type="checkbox"
                        checked={$filtersRef[action.id]}
                        onclick={() => onClickAction(action.id)}
                    />
                    <div>
                        <a
                            href={action.siteUrl}
                            target="_blank"
                            title={action.description}
                        >
                            <strong>{action.type}</strong> <br />
                            <small>{action.title}</small>
                        </a>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
{/each}

<style>
    .pagination {
        display: flex;
        gap: 1ch;
        margin-bottom: var(--line-height);
    }

    .actionUserHeader {
        text-transform: none;
        display: flex;
        gap: 1ch;
        align-items: center;
    }

    .triangle {
        display: inline-block;
        transition: transform 0.2s;
    }

    .triangle.expanded {
        transform: rotate(180deg);
    }

    .actions {
        list-style: none;
        padding: 0;
    }

    .action {
        margin: var(--line-height) 0;
        display: flex;
        gap: 2ch;
    }

    .action a {
        text-decoration: none;
    }

    .action a:hover {
        text-decoration: underline;
    }
</style>
