import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { db, isDbError, Action, ActionItem, Member, eq } from "astro:db";
import Parser from "rss-parser";
import type { ActionItemType } from "../../../db/types";

export const prerender = false;

const rssParser = new Parser();

export const GET: APIRoute = async () => {
    const actions = await db
        .select({
            id: Action.id,
            username: Member.alias,
            title: Action.title,
            description: Action.description,
            url: Action.url,
            siteUrl: Action.siteUrl,
        })
        .from(Action)
        .innerJoin(Member, eq(Action.memberDiscord, Member.discord));
    return jsonResponse({ actions });
};

export const POST: APIRoute = async (context) => {
    if (context.request.headers.get("content-type") !== "application/json")
        return jsonError("Request body must be JSON");

    const action = await context.request.json();
    if (
        !action.memberDiscord ||
        !action.title ||
        !action.description ||
        !action.url ||
        !action.siteUrl ||
        typeof action.memberDiscord !== "string" ||
        typeof action.title !== "string" ||
        typeof action.description !== "string" ||
        typeof action.url !== "string" ||
        typeof action.siteUrl !== "string" ||
        typeof action.isRSS !== "boolean"
    )
        return jsonError("Missing or invalid parameters");

    try {
        const url = new URL(action.url);
        if (!["http:", "https:"].includes(url.protocol))
            return jsonError("Invalid URL protocol");

        action.url = url.toString();
    } catch (error) {
        return jsonError("Invalid URL");
    }

    if (!action.isRSS) {
        const actionRes = await db
            .insert(Action)
            .values(action)
            .returning()
            .get();

        return jsonResponse({ action: actionRes });
    }

    try {
        const rss = await rssParser.parseURL(action.url);
        if (!rss.link || !rss.items)
            return jsonError("Invalid RSS feed missing title, link, or items");
        if (rss.items.length && !rss.items[0]!.link)
            return jsonError("Invalid RSS feed item missing title or link");

        const actionRes = await db
            .insert(Action)
            .values(action)
            .returning()
            .get();
        let items: ActionItemType[] = [];
        if (rss.items.length)
            items = await db
                .insert(ActionItem)
                .values(rss.items.map((item) => {
                    return {
                        actionID: actionRes.id,
                        title: item.title || "",
                        description: item.description || item.content || item.summary || item.contentSnippet || item.title || "",
                        url: item.link!,
                        date: new Date(item.pubDate || item.isoDate || Date.now()),
                    };
                }))
                .returning();
        return jsonResponse({ action: actionRes, items });
    } catch (error) {
        if (isDbError(error))
            return jsonError(error.message);

        console.error(error);
        return jsonError("Internal server error", 500);
    }
}