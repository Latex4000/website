import type { APIRoute } from "astro";
import { notInArray } from "drizzle-orm";
import { ActionItem } from "../../database/schema";
import { paginationQuery, parseDateCursor } from "../../server/pagination";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    // Check if there is an array of ids in the query to ignore
    const ignore = url.searchParams.get("ignore");
    const ignoreArray = ignore?.split(",")
        .map((id) => Number.parseInt(id, 10))
        .filter(Number.isInteger);

    const condition = ignoreArray != null && ignoreArray.length > 0
        ? notInArray(ActionItem.actionId, ignoreArray)
        : undefined;

    return paginationQuery(url.searchParams, ActionItem, "date", parseDateCursor, condition);
};
