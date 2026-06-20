import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import db from "../../../database/db";
import { Member } from "../../../database/schema";

export const prerender = false;

/**
 * Authenticates a request for use in an external service.
 *
 * Note that because the session cookie is read by middleware as normal, this will only work as intended when the external service is receiving a request at a subdomain of the main site.
 */
export const GET: APIRoute = async (context) => {
    context.locals.skipRecordPageView = true;

    const discord = context.locals.session.data.memberDiscord;

    if (discord == null) {
        return new Response(null, { status: 401 });
    }

    const member = await db
        .select()
        .from(Member)
        .where(and(eq(Member.discord, discord), eq(Member.deleted, false)))
        .get();

    if (member == null) {
        return new Response(null, { status: 401 });
    }

    return new Response(null, {
        headers: {
            "X-Nonacademic-Alias": member.alias,
            "X-Nonacademic-Color": member.color,
            "X-Nonacademic-Discord": member.discord,
        },
        status: 204,
    });
};
