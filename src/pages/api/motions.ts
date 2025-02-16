import { LibsqlError } from "@libsql/client";
import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { thingDeletion, thingGet } from "../../server/thingUtils";
import db from "../../database/db";
import { Motion } from "../../database/schema";

export const prerender = false;

export const GET: APIRoute = async (context) => thingGet(context, "motions");

export const POST: APIRoute = async ({ request }) => {
    if (request.headers.get("content-type") !== "application/json")
        return jsonError("Invalid content type");

    const motionData = await request.json();

    if (motionData.memberDiscord && typeof motionData.memberDiscord !== "string")
        return jsonError("Invalid motion data");

    if (
        !motionData.title ||
        !motionData.youtubeUrl ||
        !motionData.tags ||
        typeof motionData.title !== "string" ||
        typeof motionData.youtubeUrl !== "string" ||
        !URL.canParse(motionData.youtubeUrl) ||
        !Array.isArray(motionData.tags) ||
        !motionData.tags.every((tag: unknown) => typeof tag === "string")
    )
        return jsonError("Invalid motion data");

    if (motionData.tags.join("").length > 2 ** 10)
        return jsonError("Tags are too long");

    // Store to DB
    try {
        return jsonResponse(
            await db
                .insert(Motion)
                .values({
                    title: motionData.title,
                    youtubeUrl: motionData.youtubeUrl,
                    memberDiscord: motionData.memberDiscord,
                    tags: motionData.tags,
                })
                .returning()
                .get(),
        );
    } catch (error) {
        if (error instanceof LibsqlError && error.code === "SQLITE_CONSTRAINT_FOREIGNKEY")
            return jsonError(
                "Invalid Discord ID; member does not exist; probably needs to join first",
            );

        throw error;
    }
};

export const PUT: APIRoute = async (context) => thingDeletion(context, "motions", false);

export const DELETE: APIRoute = async (context) => thingDeletion(context, "motions", true);
