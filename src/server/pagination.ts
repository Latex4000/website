import { and, asc, db, desc, gt, lt } from "astro:db";
import { jsonError, jsonResponse } from "./responses";

export function getCursor(params: URLSearchParams) {
    const direction = params.get("direction") ?? "next";
    const cursor = parseInt(params.get("cursor") ?? (direction === "next" ? "0" : "999999999999"));
    const pageSize = parseInt(params.get("pageSize") ?? "10");

    if (isNaN(cursor) || isNaN(pageSize))
        return jsonError("Invalid cursor or pageSize");
    if (direction !== "next" && direction !== "prev")
        return jsonError("Invalid direction");

    return { direction, cursor, pageSize };
}

// Idk how to type this
export async function paginationQuery(params: URLSearchParams, table: any, ...queries: any[]) {
    const cursorInfo = getCursor(params);
    if ("status" in cursorInfo)
        return cursorInfo;
    const { direction, cursor, pageSize } = cursorInfo;

    const things = await db
        .select()
        .from(table)
        .where(
            and(
                direction === "next" ? gt(table.id, cursor) : lt(table.id, cursor),
                ...queries,
            )
        )
        .limit(pageSize)
        .orderBy(direction === "next" ? asc(table.id) : desc(table.id));

    if (things.length && direction === "prev")
        things.reverse();

    return jsonResponse({
        things,
        prevCursor: things[0]?.id ?? undefined,
        nextCursor: things.length === pageSize ? things[things.length - 1]?.id : undefined,
    });
}