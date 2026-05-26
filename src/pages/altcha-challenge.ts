import type { APIRoute } from "astro";
import { jsonResponse } from "../server/responses";
import { createChallenge } from "../server/altcha";

export const prerender = false;

export const GET: APIRoute = async () => {
    return jsonResponse(await createChallenge());
};
