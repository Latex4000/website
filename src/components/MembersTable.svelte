<script lang="ts">
function shuffle (array: any[]) {
    let currentIndex = array.length;

    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
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
    .then((members) => {
        shuffle(members);
        return members.filter((member: Member) => member.addedRingToSite);
    });
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