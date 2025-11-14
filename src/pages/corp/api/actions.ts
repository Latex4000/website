import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse, JsonResponseError } from "../../../server/responses";
import { Action } from "../../../database/schema";
import { processActionSubmission, requireCorpMember, postJsonToSiteApi, tryPostToDiscordFeed } from "../../../server/submissions";

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

    let processed: Awaited<ReturnType<typeof processActionSubmission>>;
    try {
        processed = await processActionSubmission({
            link,
            isRSS,
            title: titleOverride,
            description: descriptionOverride,
        });
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to process RSS feed");
    }

    let upstream: { action: InferSelectModel<typeof Action> };
    try {
        upstream = await postJsonToSiteApi<{ action: InferSelectModel<typeof Action> }>(context, "/api/actions", {
            memberDiscord: member.discord,
            title: processed.title,
            description: processed.description,
            url: processed.link,
            siteUrl: processed.link,
            isRSS: processed.isRSS,
        });
    } catch (error) {
        if (error instanceof JsonResponseError)
            return error.response;
        throw error;
    }

    await tryPostToDiscordFeed(
        `<@${member.discord}> added an action\nTitle: ${upstream.action.title}\nLink: ${upstream.action.siteUrl}`,
    );

    return jsonResponse({
        ...upstream,
        feedTitle: processed.feedTitle,
    });
};
