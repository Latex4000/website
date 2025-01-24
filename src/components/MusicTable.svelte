<script lang="ts">
import type { SoundType } from "../../db/config";

let { sounds }: { sounds: SoundType[] } = $props();
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