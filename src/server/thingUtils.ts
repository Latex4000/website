import { LibsqlError } from "@libsql/client";
import type { APIContext, APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import { jsonError, jsonResponse } from "./responses";
import { paginationQuery, parseNumberCursor } from "./pagination";
import db, { retryIfDbBusy } from "../database/db";
import { Action, Motion, Sight, Sound, Word } from "../database/schema";

const thingTypeToTable = {
    words: Word,
    sounds: Sound,
    motions: Motion,
    sights: Sight,
    actions: Action,
};
type ThingType = keyof typeof thingTypeToTable;
const thingTypes = Object.keys(thingTypeToTable);
export function isThingType(value: string): value is ThingType {
    return thingTypes.includes(value);
}

export async function thingGet({ url }: APIContext, thingType: ThingType) {
    const table = thingTypeToTable[thingType];

    const params = url.searchParams;
    const discordID = params.get("discord");
    if (!discordID || typeof discordID !== "string")
        return jsonError("Invalid Discord ID");

    const showDeleted = params.get("showDeleted");
    if (showDeleted && showDeleted !== "true" && showDeleted !== "false")
        return jsonError("Invalid showDeleted");

    return paginationQuery(
        params,
        table,
        "id",
        parseNumberCursor,
        eq(table.memberDiscord, discordID),
        eq(table.deleted, showDeleted === "true"),
    );
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
        const thingRes = await retryIfDbBusy(() =>
            db
                .update(table)
                .set(thing)
                .where(eq(table.id, parseInt(id)))
                .returning()
        );

        return jsonResponse(thingRes);
    } catch (err: any) {
        if (typeof err.status === "number")
            return jsonError(err.message, err.status);

        if (err instanceof LibsqlError)
            return jsonError(err.message);

        console.error(err);
        return jsonError("Internal server error", 500);
    }
}

export function thingColourHandler<T extends { memberColor: string, showColour: boolean }>(rows: T[]): (Omit<T, "showColour" | "memberColor"> & { memberColor?: string })[] {
    return rows.map((row) => {
        return {
            ...row,
            memberColor: row.showColour ? row.memberColor : undefined,
            showColour: undefined,
        };
    });
}

export function thingIDRewriteRoute(resourceName: string): APIRoute {
    const localKey = `${resourceName.slice(0, -1)}Id` as keyof App.Locals;
    const rewritePath = `/${resourceName}`;

    return (context) => {
        const idMatch = context.params.id?.match(/^\d+/);

        if (idMatch == null) {
            return new Response(null, { status: 404 });
        }

        // If it's not any it fucking says bullshit like 'Number is not assignable to type never' like a dumbass so
        (context.locals as any)[localKey] = Number.parseInt(idMatch[0], 10);

        return context.rewrite(rewritePath);
    };
}

declare global {
    namespace App {
        interface Locals {
            soundId?: number;
            sightId?: number;
            motionId?: number;
        }
    }
}