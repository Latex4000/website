import type { APIContext } from "astro";
import { jsonError, jsonResponse } from "./responses";
import { and, db, eq, isDbError, Motion, Word, Sound, gt, asc, desc, lt } from "astro:db";

const thingTypeToTable = {
    words: Word,
    sounds: Sound,
    motions: Motion,
};
type ThingType = keyof typeof thingTypeToTable;
const thingTypes = Object.keys(thingTypeToTable);
export function isThingType(value: string): value is ThingType {
    return thingTypes.includes(value);
}

export async function thingGet({ url }: APIContext, thingType: ThingType) {
    const params = url.searchParams;
    const discordID = params.get("discord");
    if (!discordID || typeof discordID !== "string")
        return jsonError("Invalid Discord ID");

    const direction = params.get("direction") ?? "next";
    const cursor = parseInt(params.get("cursor") ?? (direction === "next" ? "0" : "999999999999"));
    const pageSize = parseInt(params.get("pageSize") ?? "10");

    if (isNaN(cursor) || isNaN(pageSize))
        return jsonError("Invalid cursor or pageSize");
    if (direction !== "next" && direction !== "prev")
        return jsonError("Invalid direction");

    const showDeleted = params.get("showDeleted");
    if (showDeleted && showDeleted !== "true" && showDeleted !== "false")
        return jsonError("Invalid showDeleted");

    const table = thingTypeToTable[thingType];

    const things = await db
        .select()
        .from(table)
        .where(
            and(
                direction === "next" ? gt(table.id, cursor) : lt(table.id, cursor),
                eq(table.memberDiscord, discordID),
                eq(table.deleted, showDeleted === "true"),
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

export async function thingDeletion({ url }: APIContext, thingType: ThingType, isDeleted: boolean) {
    const params = url.searchParams;
    const discordID = params.get("discord");
    if (!discordID || typeof discordID !== "string")
        return jsonError("Invalid Discord ID");

    const id = params.get("id");
    if (!id || isNaN(parseInt(id)))
        return jsonError("Invalid ID");

    const table = thingTypeToTable[thingType];

    const thing = await db
        .select()
        .from(table)
        .where(and(eq(table.id, parseInt(id)), eq(table.memberDiscord, discordID)))
        .get();
    if (!thing)
        return jsonError(`${thingType} not found`);

    thing.deleted = isDeleted;

    try {
        const thingRes = await db
            .update(table)
            .set(thing)
            .where(eq(table.id, parseInt(id)))
            .returning();

        return jsonResponse(thingRes);
    } catch (err: any) {
        if (typeof err.status === "number")
            return jsonError(err.message, err.status);

        if (isDbError(err)) return jsonError(err.message);

        console.error(err);
        return jsonError("Internal server error", 500);
    }
}