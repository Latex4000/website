import type { APIRoute } from "astro";
import { db, Member } from "astro:db";
import { jsonResponse } from "../../server/responses";
import { hmacInvalidResponse, validateHmac } from "../../server/hmac";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    if (!await validateHmac(request)) {
        return hmacInvalidResponse();
    }

    return jsonResponse(await db.select().from(Member));
}
