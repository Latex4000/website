<script lang="ts">
import type { Member } from "../../db/config";

let { members }: { members: Member[] } = $props();
</script>

<p>
    {#each members as member, i}
        {#if member.addedRingToSite}
            <a href={member.site}>{member.alias}</a>
        {:else}
            <span>{member.alias}</span>
        {/if}
        
        {#if i < members.length - 1}|&nbsp; {/if}
    {/each}
</p>