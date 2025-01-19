import type { APIRoute } from "astro";
import { db, isDbError, Member } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify(await db.select().from(Member)));
};

export const POST: APIRoute = async ({ request }) => {
    if (request.headers.get("content-type") !== "application/json")
        return new Response(null, { status: 400 });
    const member = await request.json();
    try {
        await db.insert(Member).values([member]);
        return new Response(JSON.stringify(member));
    } catch (e) {
        if (isDbError(e))
            return new Response(JSON.stringify({ error: e.message }), { status: 400 });
        console.error(e);
        return new Response(null, { status: 500 });
    }
};