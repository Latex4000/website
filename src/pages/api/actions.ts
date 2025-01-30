import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { db, isDbError, Action } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async (context) => {
    return jsonResponse("Yey");
}