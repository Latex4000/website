import type { APIRoute } from "astro";
import checkHmac from "../../server/hmac";
import { jsonError, jsonResponse } from "../../server/responses";
import { db, isDbError, Sound } from "astro:db";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        if (request.headers.get("content-type") !== "application/json")
            throw new Error("Invalid content type");

        const sound = await request.json();

        if (!checkHmac(request, JSON.stringify(sound))) {
            const err = new Error("Forbidden");
            (err as any).status = 401; 
            throw err;
        }

        if (
            !sound.title ||
            !sound.youtubeUrl ||
            !sound.soundcloudUrl ||
            !sound.date ||
            typeof sound.title !== "string" ||
            typeof sound.youtubeUrl !== "string" ||
            typeof sound.soundcloudUrl !== "string" ||
            typeof sound.date !== "string" ||
            isNaN(Date.parse(sound.date))
        )
            throw new Error("Member has missing string keys/invalid keys");

        sound.date = new Date(sound.date);

        const soundRes = await db.insert(Sound).values([sound]).returning();
        return jsonResponse(soundRes);
    } catch (err: any) {
        if (typeof err.status === "number")
            return jsonError(err.message, err.status);

        if (isDbError(err))
            return jsonError(err.message);

        console.error(err);
        return jsonError("Internal server error", 500);
    }
};