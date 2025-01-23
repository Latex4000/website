<script lang="ts">
  import type { Member } from "../../db/config";

  let { members }: { members: Member[] } = $props();
</script>

<div class="member-list">
  Signed:
  <ul>
    {#each members as member}
      {#if member.addedRingToSite}
        <li><a href={member.site}>{member.alias}</a></li>
      {:else}
        <li>{member.alias}</li>
      {/if}
    {/each}
  </ul>
</div>

<style>
  ul {
    margin-top: 0.5rem;
    column-count: 5;
  }
  @media only screen and (max-width: 600px) {
    ul {
      column-count: auto;
    }
  }
</style>
