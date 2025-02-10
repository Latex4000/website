import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { db, isDbError, Motion } from "astro:db";
import { motionFromDb } from "../../../db/config";
import { type MotionType } from "../../../db/types";
import { thingDeletion, thingGet } from "../../server/thingUtils";

export const prerender = false;

export const GET: APIRoute = async (context) => thingGet(context, "motions");

export const POST: APIRoute = async ({ request }) => {
    if (request.headers.get("content-type") !== "application/json")
        return jsonError("Invalid content type");

    const motionData = await request.json();

    if (
        !motionData.title ||
        !motionData.youtubeUrl ||
        !motionData.memberDiscord ||
        !motionData.tags ||
        typeof motionData.title !== "string" ||
        typeof motionData.youtubeUrl !== "string" ||
        typeof motionData.memberDiscord !== "string" ||
        !URL.canParse(motionData.youtubeUrl) ||
        !Array.isArray(motionData.tags) ||
        !motionData.tags.every((tag: unknown) => typeof tag === "string")
    )
        return jsonError("Invalid motion data");

    if (motionData.tags.join("").length > 2 ** 10)
        return jsonError("Tags are too long");

    // Store to DB
    let motion: MotionType;
    try {
        motion = motionFromDb(
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
        if (isDbError(error) && error.code === "SQLITE_CONSTRAINT_FOREIGNKEY")
            return jsonError(
                "Invalid Discord ID; member does not exist; probably needs to join first",
            );

        throw error;
    }

    return jsonResponse(motion);
};

export const PUT: APIRoute = async (context) => thingDeletion(context, "motions", false);

export const DELETE: APIRoute = async (context) => thingDeletion(context, "motions", true);