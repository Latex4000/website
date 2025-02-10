import { and, asc, db, desc, gt, lt } from "astro:db";
import { jsonError, jsonResponse } from "./responses";

interface CursorInfo<T> {
    direction: "next" | "prev";
    cursor: T;
    pageSize: number;
}

export function parseNumberCursor(raw: string | null, direction: "next" | "prev"): number {
    if (!raw)
        return direction === "next" ? 0 : 999999999999;

    const val = parseInt(raw, 10);
    if (isNaN(val))
        throw new Error("Invalid numeric cursor");

    return val;
}

export function parseDateCursor(raw: string | null, direction: "next" | "prev"): Date {
    if (!raw)
        return direction === "next" ? new Date("1970-01-01T00:00:00Z") : new Date("2999-12-31T23:59:59Z");

    const val = new Date(raw);
    if (isNaN(val.getTime()))
        throw new Error("Invalid date cursor");

    return val;
}

export function getCursor<T>(params: URLSearchParams, parseCursor: (raw: string | null, direction: "next" | "prev") => T): Response | CursorInfo<T> {
    const direction = params.get("direction") ?? "prev";
    const pageSize = parseInt(params.get("pageSize") ?? "10");

    if (isNaN(pageSize))
        return jsonError("Invalid pageSize");
    if (direction !== "next" && direction !== "prev")
        return jsonError("Invalid direction");

    let cursor: T;
    try {
        cursor = parseCursor(params.get("cursor"), direction);
    } catch (error) {
        return jsonError("Invalid cursor");
    }

    return { direction, cursor, pageSize };
}

// Idk how to type this
export async function paginationQuery<T>(params: URLSearchParams, table: any, cursorProp: string, parseCursor: (raw: string | null, direction: "next" | "prev") => T, ...queries: any[]) {
    const cursorInfo = getCursor(params, parseCursor);
    if ("status" in cursorInfo)
        return cursorInfo;
    const { direction, cursor, pageSize } = cursorInfo;

    const things = await db
        .select()
        .from(table)
        .where(
            and(
                direction === "next" ? gt(table[cursorProp], cursor) : lt(table[cursorProp], cursor),
                ...queries,
            )
        )
        .limit(pageSize)
        .orderBy(direction === "next" ? asc(table[cursorProp]) : desc(table[cursorProp]));

    if (things.length && direction === "prev")
        things.reverse();

    return jsonResponse({
        things,
        prevCursor: things[0] ? things[0][cursorProp] : undefined,
        nextCursor: things.length === pageSize ? things[things.length - 1]?.[cursorProp] : undefined,
    } as { things: any[]; prevCursor?: T; nextCursor?: T });
}