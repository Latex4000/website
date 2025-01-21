import type { APIRoute } from "astro";
import { db, Member } from "astro:db";
import checkHmac from "../../server/hmac";
import { jsonError, jsonResponse } from "../../server/responses";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    if (!checkHmac(request, "")) {
        return jsonError("Invalid HMAC", 401);
    }

    return jsonResponse(await db.select().from(Member));
}
