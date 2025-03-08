import { LibsqlError } from "@libsql/client";
import type { APIRoute } from "astro";
import { eq, type InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse } from "../../server/responses";
import Parser from "rss-parser";
import db, { dbOperation } from "../../database/db";
import { Action, ActionItem, Member } from "../../database/schema";
import { thingDeletion, thingGet } from "../../server/thingUtils";

export const prerender = false;

const rssParser = new Parser();


export const GET: APIRoute = async (context) => thingGet(context, "actions");

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

    const member = await db
        .select()
        .from(Member)
        .where(eq(Member.discord, action.memberDiscord))
        .get();
    if (!member) {
        return jsonError("Member does not exist");
    }

    if (member.deleted) {
        return jsonError("Member has been deleted");
    }

    if (!action.isRSS) {
        const actionRes = await dbOperation(() =>
            db
                .insert(Action)
                .values(action)
                .returning()
                .get()
        );

        return jsonResponse({ action: actionRes });
    }

    try {
        const rss = await rssParser.parseURL(action.url);
        if (!rss.link || !rss.items)
            return jsonError("Invalid RSS feed missing title, link, or items");
        if (rss.items.length && !rss.items[0]!.link)
            return jsonError("Invalid RSS feed item missing title or link");

        const actionRes = await dbOperation(() =>
            db
                .insert(Action)
                .values(action)
                .returning()
                .get()
        );
        let items: InferSelectModel<typeof ActionItem>[] = [];
        if (rss.items.length)
            items = await dbOperation(() =>
                db
                    .insert(ActionItem)
                    .values(rss.items.map((item) => ({
                        actionID: actionRes.id,
                        title: item.title || "",
                        description: item.description || item.content || item.summary || item.contentSnippet || item.title || "",
                        url: item.link!,
                        date: new Date(item.pubDate || item.isoDate || Date.now()),
                    })))
                    .returning()
            );
        return jsonResponse({ action: actionRes, items });
    } catch (error) {
        if (error instanceof LibsqlError)
            return jsonError(error.message);

        console.error(error);
        return jsonError("Internal server error", 500);
    }
}

export const PUT: APIRoute = async (context) => thingDeletion(context, "actions", false);

export const DELETE: APIRoute = async (context) => thingDeletion(context, "actions", true);