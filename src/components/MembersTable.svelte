<script lang="ts">
function rotateArray<T>(array: T[]): T[] {
    const startIndex = Math.round(Math.random() * array.length);
    return [...array.slice(startIndex), ...array.slice(0, startIndex)];
}

interface Member {
    discord: string;
    alias: string;
    aliasEncoded: string;
    site: string;
    addedRingToSite: boolean;
}

const data: Promise<Member[]> = fetch("https://latex4000.neocities.org/members.json")
    .then((r) => r.json())
    .then((members: Member[]) => rotateArray(members).filter((member: Member) => member.addedRingToSite));
</script>

{#await data}
    <p>Loading...</p>
{:then members}
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
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}