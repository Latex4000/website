import type { APIRoute } from "astro";
import db from "../../database/db";
import { eq, notInArray, or } from "drizzle-orm";
import { Action, ActionItem, Member } from "../../database/schema";
import { paginationQuery, parseDateCursor } from "../../server/pagination";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    // Check if there is an array of ids in the query to ignore
    const ignore = url.searchParams.get("ignore");
    const ignoreArray: number[] = ignore?.split(",")
        .map((id) => Number.parseInt(id, 10))
        .filter(Number.isInteger) ?? [];

    // Add deleted actions to the ignore array
    const deletedActions = await db
        .select({ id: Action.id })
        .from(Action)
        .innerJoin(Member, eq(Action.memberDiscord, Member.discord))
        .where(or(eq(Action.deleted, true), eq(Member.deleted, true)));
    
    if (deletedActions && deletedActions.length > 0)
        ignoreArray.push(...deletedActions.map((action) => action.id));

    const condition = ignoreArray != null && ignoreArray.length > 0
        ? notInArray(ActionItem.actionID, ignoreArray)
        : undefined;

    return paginationQuery(url.searchParams, ActionItem, "date", parseDateCursor, condition);
};
