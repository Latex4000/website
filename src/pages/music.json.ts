import type { APIRoute } from "astro";
import { db, Sound } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async () => {
    return new Response(JSON.stringify(await db.select().from(Sound)));
}