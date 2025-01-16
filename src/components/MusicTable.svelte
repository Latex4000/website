<script lang="ts">    
interface Song {
    title: string;
    youtubeUrl: string;
    soundcloudUrl: string;
}

const data: Promise<Song[]> = fetch("/music.json")
    .then((r) => r.json());
</script>

{#await data}
    <p>Loading...</p>
{:then music}
    <table>
        <thead>
            <tr>
                <th>Title</th>
                <th>YouTube</th>
                <th>SoundCloud</th>
            </tr>
        </thead>
        <tbody>
            {#each music as song}
                <tr>
                    <td>{song.title}</td>
                    <td><a href={song.youtubeUrl}>Link</a></td>
                    <td><a href={song.soundcloudUrl}>Link</a></td>
                </tr>
            {/each}
        </tbody>
    </table>
{:catch error}
    <p style="color: red">{error.message}</p>
{/await}