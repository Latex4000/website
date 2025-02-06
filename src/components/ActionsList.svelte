<script lang="ts">
    import {
        actionsRef,
        filtersRef,
        type ActionList,
    } from "../store/actionsState";

    const actionsGroupedByUser = $actionsRef.reduce(
        (acc, action) => {
            acc[action.username] ??= [];
            acc[action.username]!.push(action);
            return acc;
        },
        {} as Record<string, ActionList[]>,
    );
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
                        bind:checked={$filtersRef[action.id]}
                    />
                </li>
            {/each}
        </ul>
    {/each}
</div>
