<script lang="ts">
    import type { MemberType } from "../../db/config";

    export let members: MemberType[] = [];
    let columnCount = 5;

    function gridColumns(node: Node) {
        const containerWidth = (node as HTMLElement).clientWidth;
        const lineHeight =
            parseFloat(
                window
                    .getComputedStyle(node as HTMLElement)
                    .getPropertyValue("--line-height"),
            ) * 16; // rem to px
        const gridColumnWidth =
            (containerWidth - (lineHeight / 2) * 4) / columnCount;
        (node as HTMLElement).style.gridTemplateColumns =
            `repeat(${columnCount}, minmax(${gridColumnWidth}px, 1fr))`;
    }

    function gridSpan(node: Node) {
        const memberList = document.getElementById("member-list")!;
        const containerWidth = memberList.clientWidth;
        const lineHeight =
            parseFloat(
                window
                    .getComputedStyle(node as HTMLElement)
                    .getPropertyValue("--line-height"),
            ) * 16; // rem to px
        const gridColumnWidth =
            (containerWidth - (lineHeight / 2) * 4) / columnCount;

        // Change span from more than 1 if text is too long
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${window.getComputedStyle(node as HTMLElement).fontSize} ${window.getComputedStyle(node as HTMLElement).fontFamily}`;
        // Text measurement + marker
        const itemWidth =
            context.measureText((node as HTMLElement).textContent!).width +
            16 +
            7; // Fucking margin + marker size

        const gridSpan = Math.min(
            Math.ceil(itemWidth / gridColumnWidth),
            columnCount,
        );
        (node as HTMLElement).style.gridColumn = `span ${gridSpan}`;
    }

    // on window resize
    window.addEventListener("resize", () => {
        columnCount = Math.floor(
            Math.min(5, Math.max(2, 0.0332942 * window.innerWidth - 18.60778)),
        ); // Dude idk look at this https://www.desmos.com/calculator/cvs8zridx4
        gridColumns(document.getElementById("member-list")!);
    });
</script>

<div>
    Signed:
    <ul id="member-list" use:gridColumns>
        {#each members as member}
            {#if member.addedRingToSite}
                <li use:gridSpan><a href={member.site}>{member.alias}</a></li>
            {:else}
                <li use:gridSpan>{member.alias}</li>
            {/if}
        {/each}
    </ul>
</div>

<style>
    ul {
        margin-top: calc(var(--line-height) / 2);
        padding: 0;
        display: grid;
        row-gap: var(--line-height);
        column-gap: calc(var(--line-height) / 2);
        width: 100%;
    }

    li {
        white-space: nowrap;
        list-style-position: inside;
    }
</style>
