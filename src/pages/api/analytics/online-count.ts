import type { APIRoute } from "astro";
import { getOnlineVisitorCount } from "../../../server/analytics";
import { jsonError, jsonResponse } from "../../../server/responses";

export const prerender = false;

export const GET: APIRoute = async (context) => {
    try {
        const online = await getOnlineVisitorCount(context);
        return jsonResponse({ online });
    } catch (error) {
        console.error("Failed to retrieve online visitor count", error);
        return jsonError("Unable to retrieve online visitor count", 500);
    }
};
