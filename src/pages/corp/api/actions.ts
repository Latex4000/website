import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse, JsonResponseError } from "../../../server/responses";
import { Action } from "../../../database/schema";
import { postJsonToBot, requireCorpMember } from "../../../server/submissions";

export const prerender = false;

export const POST: APIRoute = async (context) => {
    const member = await requireCorpMember(context);

    if (context.request.headers.get("content-type")?.includes("application/json") !== true)
        return jsonError("Request body must be JSON");

    let payload: Record<string, unknown>;
    try {
        payload = await context.request.json();
    } catch {
        return jsonError("Invalid JSON payload");
    }

    const link = typeof payload.link === "string" ? payload.link : null;
    const isRSS = typeof payload.isRSS === "boolean" ? payload.isRSS : null;
    const titleOverride = typeof payload.title === "string" ? payload.title : null;
    const descriptionOverride = typeof payload.description === "string" ? payload.description : null;

    if (!link || isRSS == null)
        return jsonError("Missing link or isRSS flag");

    try {
        const response = await postJsonToBot<{ action: InferSelectModel<typeof Action>; feedTitle?: string | null }>(
            "/things/actions",
            {
                discord: member.discord,
                link,
                isRSS,
                title: titleOverride,
                description: descriptionOverride,
            },
        );
        return jsonResponse(response);
    } catch (error) {
        if (error instanceof JsonResponseError)
            return error.response;
        throw error;
    }
};
