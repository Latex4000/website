<script lang="ts">
    import { type SensationList } from "./SensationsType";

    let {
        sensationsList,
        importList,
        deleteList,
    }: {
        sensationsList: SensationList[];
        importList: () => void;
        deleteList: () => void;
    } = $props();

    function exportData() {
        const data = [...sensationsList];
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sensations_export.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
</script>

<button onclick={importList}>Import Data</button>
<button onclick={exportData}>Export Data</button>
<button onclick={deleteList}>Delete All Data</button>
