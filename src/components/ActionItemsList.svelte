<script lang="ts">
    import { actionItemsRef } from "../store/actionsState";
</script>

<ul>
    {#each $actionItemsRef as item}
        <li>
            <a href={item.url}><strong>{item.title}</strong></a> <br />
            {item.description} <br />
            <small>Date: {item.date.toLocaleString()}</small>
        </li>
    {/each}
</ul>
