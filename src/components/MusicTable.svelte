<script lang="ts">
import type { Sound } from "../../db/config";

let { sounds }: { sounds: Sound[] } = $props();
</script>

<table>
    <thead>
        <tr>
            <th>Date</th>
            <th>Title</th>
            <th>YouTube</th>
            <th>SoundCloud</th>
        </tr>
    </thead>
    <tbody>
        {#each sounds as sound}
            <tr>
                <td><small>{new Date(sound.date).toLocaleString()}</small></td>
                <td>{sound.title}</td>
                <td><a href={sound.youtubeUrl}>Link</a></td>
                <td><a href={sound.soundcloudUrl}>Link</a></td>
            </tr>
        {/each}
    </tbody>
</table>