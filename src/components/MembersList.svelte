<script lang="ts">
    import type { MemberType } from "../../db/config";

    export let members: MemberType[] = [];
    let columnCount = 5;

    function gridColumns(node: Node) {
        columnCount = Math.floor(
            Math.min(5, Math.max(2, 0.0332942 * window.innerWidth - 18.60778)),
        ); // Dude idk look at this https://www.desmos.com/calculator/cvs8zridx4

        const containerWidth = (node as HTMLElement).clientWidth;
        const lineHeight =
            parseFloat(
                getComputedStyle(node as HTMLElement).getPropertyValue(
                    "--line-height",
                ),
            ) * parseFloat(getComputedStyle(document.body).fontSize); // rem to px
        const gridColumnWidth =
            (containerWidth - (lineHeight / 2) * 4) / columnCount;

        (node as HTMLElement).style.gridTemplateColumns =
            `repeat(${columnCount}, minmax(${gridColumnWidth}px, 1fr))`;

        const children = document.getElementById("member-list")!.children;
        for (let i = 0; i < children.length; i++)
            if (children[i]) gridSpan(children[i]!);
    }

    function gridSpan(node: Node) {
        const memberList = document.getElementById("member-list")!;
        const containerWidth = memberList.clientWidth;
        const lineHeight =
            parseFloat(
                getComputedStyle(node as HTMLElement).getPropertyValue(
                    "--line-height",
                ),
            ) * parseFloat(getComputedStyle(document.body).fontSize); // rem to px
        const gridColumnWidth =
            (containerWidth - (lineHeight / 2) * 4) / columnCount;

        // Change span from more than 1 if text is too long
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;
        context.font = `${getComputedStyle(node as HTMLElement).fontSize} ${getComputedStyle(node as HTMLElement).fontFamily}`;
        // Text measurement + marker
        const itemWidth =
            context.measureText((node as HTMLElement).textContent!).width +
            parseFloat(getComputedStyle(document.body).fontSize) * 1.4375; // Fucking margin + marker size

        const gridSpan = Math.min(
            Math.ceil(itemWidth / gridColumnWidth),
            columnCount,
        );
        (node as HTMLElement).style.gridColumn = `span ${gridSpan}`;
    }

    // on window resize
    window.addEventListener("resize", () =>
        gridColumns(document.getElementById("member-list")!),
    );
    const bodyResizeObserver = new ResizeObserver(() =>
        gridColumns(document.getElementById("member-list")!),
    );
    bodyResizeObserver.observe(document.body);
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
        row-gap: calc(var(--line-height) / 2);
        column-gap: calc(var(--line-height) / 2);
        width: 100%;
    }

    li {
        white-space: nowrap;
        list-style-position: inside;
    }
</style>
