<script lang="ts">
import type { Member } from "../../db/config";

let { members }: { members: Member[] } = $props();
</script>

<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Site</th>
        </tr>
    </thead>
    <tbody>
        {#each members as member}
            <tr>
                <td>{member.alias}</td>
                <td><a href={member.site}>{member.site}</a></td>
            </tr>
        {/each}
    </tbody>
</table>