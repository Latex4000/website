import type { APIRoute } from "astro";
import db from "../../database/db";
import { eq, notInArray } from "drizzle-orm";
import { Action, ActionItem } from "../../database/schema";
import { paginationQuery, parseDateCursor } from "../../server/pagination";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    // Check if there is an array of ids in the query to ignore
    const ignore = url.searchParams.get("ignore");
    const ignoreArray: number[] = ignore?.split(",")
        .map((id) => Number.parseInt(id, 10))
        .filter(Number.isInteger) ?? [];

    // Add deleted actions to the ignore array
    const actions = await db
        .select({ id: Action.id })
        .from(Action)
        .where(eq(Action.deleted, true));
    if (actions && actions.length > 0)
        ignoreArray.push(...actions.map((action) => action.id));

    const condition = ignoreArray != null && ignoreArray.length > 0
        ? notInArray(ActionItem.actionID, ignoreArray)
        : undefined;

    return paginationQuery(url.searchParams, ActionItem, "date", parseDateCursor, condition);
};
