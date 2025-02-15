import { and, asc, desc, gt, lt, type SQLWrapper } from "drizzle-orm";
import type { SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import db from "../database/db";
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

export async function paginationQuery<
    TTable extends SQLiteTableWithColumns<any>,
    TColumnName extends keyof TTable["_"]["columns"],
>(
    params: URLSearchParams,
    table: TTable,
    cursorProp: TColumnName,
    parseCursor: (raw: string | null, direction: "next" | "prev") => TTable["_"]["columns"][TColumnName]["_"]["data"],
    ...conditions: (SQLWrapper | undefined)[]
): Promise<Response> {
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
                ...conditions,
            )
        )
        .limit(pageSize)
        .orderBy(direction === "next" ? asc(table[cursorProp]) : desc(table[cursorProp]));

    if (things.length && direction === "prev")
        things.reverse();

    return jsonResponse({
        things,
        prevCursor: things[0]?.[cursorProp],
        nextCursor: things[pageSize - 1]?.[cursorProp],
    });
}
