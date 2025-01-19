import type { APIRoute } from "astro";
import { db, isDbError, Member } from "astro:db";
import { checkHmac } from "../../server/hmac";

export const prerender = false;

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify(await db.select().from(Member)));
};

export const POST: APIRoute = async ({ request }) => {
    if (request.headers.get("content-type") !== "application/json")
        return new Response(JSON.stringify({ error: "Invalid content type" }), { status: 400 });

    const member = await request.json();
    if (!checkHmac(request, JSON.stringify(member)))
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 401 });

    if (!member.discord || !member.alias || !member.site || typeof member.discord !== "string" || typeof member.alias !== "string" || typeof member.site !== "string")
        return new Response(JSON.stringify({ error: "Member has missing string keys/invalid keys" }), { status: 400 });

    try {
        member.site = new URL(member.site).toString();
    } catch (e) {
        // try adding https
        try {
            member.site = new URL("https://" + member.site).toString();
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid site" }), { status: 400 });
        }
    }

    if (member.addedRingToSite)
        return new Response(JSON.stringify({ error: "Cannot add a member with addedRingToSite set to true" }), { status: 400 });

    member.addedRingToSite = false;

    try {
        await db.insert(Member).values([member]);
        return new Response(JSON.stringify(member));
    } catch (e) {
        if (isDbError(e))
            return new Response(JSON.stringify({ error: e.message }), { status: 400 });
        console.error(e);
        return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
    }
};
