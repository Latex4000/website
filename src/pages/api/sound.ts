import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { db, isDbError, Sound } from "astro:db";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        if (request.headers.get("content-type") !== "application/json")
            return jsonError("Invalid content type");

        const sound = await request.json();

        if (
            !sound.title ||
            !sound.youtubeUrl ||
            !sound.soundcloudUrl ||
            typeof sound.title !== "string" ||
            typeof sound.youtubeUrl !== "string" ||
            typeof sound.soundcloudUrl !== "string"
        )
            return jsonError("Member has missing string keys/invalid keys");

        await db.insert(Sound).values(sound);
        return jsonResponse(null);
    } catch (err: any) {
        if (typeof err.status === "number")
            return jsonError(err.message, err.status);

        if (isDbError(err))
            return jsonError(err.message);

        console.error(err);
        return jsonError("Internal server error", 500);
    }
};
