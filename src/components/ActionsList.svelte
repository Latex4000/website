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
    import { detectFeedType } from "../server/rss";

    onMount(async () => {
        const rawActions: {
            id: number;
            username: string;
            title: string;
            description: string;
            url: string;
        }[] = await fetch("/api/actions")
            .then((res) => res.json())
            .then((json) => json.actions);

        actionsRef.set(
            rawActions.map((row) => ({
                ...row,
                type: detectFeedType(row.url),
            })),
        );

        await updateActionItems();
    });

    const updateActionItems = async () => {
        const {
            things: actionItems,
            prevCursor,
            nextCursor,
        } = await fetch(
            `/api/actionitems?pageSize=100&ignore=${Object.entries($filtersRef)
                .filter(([_, v]) => !v)
                .map(([k, _]) => k)
                .join(",")}`,
        ).then((res) => res.json());

        actionItemsRef.set(actionItems);
        prevCursorRef.set(prevCursor);
        nextCursorRef.set(nextCursor);
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

    const onClickHandler = async (actionID: number) => {
        filtersRef.setKey(actionID, !$filtersRef[actionID]);
        await updateActionItems();
    };
</script>

<div>
    {#each Object.entries(actionsGroupedByUser) as [username, actions]}
        <h2>{username}</h2>
        <ul>
            {#each actions as action}
                <li>
                    <div>
                        <strong>{action.title}</strong> <br />
                        {action.description} <br />
                        <a href={action.url} target="_blank">Link</a> <br />
                        <small>Feed Type: {action.type}</small>
                    </div>
                    <input
                        type="checkbox"
                        onclick={() => onClickHandler(action.id)}
                    />
                </li>
            {/each}
        </ul>
    {/each}
</div>
