import type { APIRoute } from "astro";
import { paginationQuery } from "../../server/pagination";
import { ActionItem, inArray, not } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    // Check if there is an array of ids in the query to ignore
    const ignore = url.searchParams.get("ignore");
    const notQ = not(inArray(
        ActionItem.actionID,
        ignore ? ignore.split(",").map((id) => parseInt(id)) : []
    ));
    return paginationQuery(url.searchParams, ActionItem, notQ);
};