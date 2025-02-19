import { LibsqlError } from "@libsql/client";
import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse } from "../../server/responses";
import { mkdir } from "fs/promises";
import { execFileSync } from "child_process";
import { extname } from "path";
import { getFileOrDiscordAttachment, getTags } from "../../server/validation";
import { writeBlobToFile } from "../../server/webApi";
import { thingDeletion, thingGet } from "../../server/thingUtils";
import db from "../../database/db";
import { Sound } from "../../database/schema";

export const prerender = false;

export const GET: APIRoute = async (context) => thingGet(context, "sounds");

export const POST: APIRoute = async ({ request }) => {
    if (!process.env.SOUNDS_UPLOAD_DIRECTORY) {
        return jsonError("SOUNDS_UPLOAD_DIRECTORY not set", 500);
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    const discord = formData.get("discord");
    const title = formData.get("title");
    const soundcloudUrl = formData.get("soundcloudUrl");
    const youtubeUrl = formData.get("youtubeUrl");
    const track = await getFileOrDiscordAttachment(formData.get("track"));
    const cover = await getFileOrDiscordAttachment(formData.get("cover"));
    const tags = formData.get("tags") ?? "";

    // Form validation
    if (
        typeof discord !== "string" ||
        typeof title !== "string" ||
        !(soundcloudUrl == null || (typeof soundcloudUrl === "string" && URL.canParse(soundcloudUrl))) ||
        !(youtubeUrl == null || (typeof youtubeUrl === "string" && URL.canParse(youtubeUrl))) ||
        typeof tags !== "string"
    ) {
        return jsonError("Invalid form params");
    }

    if (tags.length > 2 ** 10) {
        return jsonError("Tags are too long");
    }

    // File validation
    const trackType = extname(track.name).slice(1);
    const coverType = extname(cover.name).slice(1);

    if (trackType !== "mp3" && trackType !== "wav") {
        return jsonError("Invalid track file extension");
    }

    if (coverType !== "jpg" && coverType !== "png") {
        return jsonError("Invalid cover file extension");
    }

    // Store to DB
    let sound: InferSelectModel<typeof Sound>;
    try {
        sound = await db
            .insert(Sound)
            .values({
                title,
                memberDiscord: discord,
                soundcloudUrl,
                youtubeUrl,
                tags: getTags(tags),
                trackType,
                coverType,
            })
            .returning()
            .get();
    } catch (error) {
        if (error instanceof LibsqlError && error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
            return jsonError("Invalid Discord ID");
        }

        throw error;
    }

    // Upload files
    const directory = `${process.env.SOUNDS_UPLOAD_DIRECTORY}/${sound.id}`;

    await mkdir(directory);

    await writeBlobToFile(`${directory}/track.${trackType}`, track);
    await writeBlobToFile(`${directory}/cover.${coverType}`, cover);

    if (process.env.SOUNDS_RUN_AFTER_UPLOAD) {
        execFileSync(process.env.SOUNDS_RUN_AFTER_UPLOAD, [directory], {
            stdio: "ignore",
        });
    }

    return jsonResponse(sound);
};

export const PUT: APIRoute = async (context) => thingDeletion(context, "sounds", false);

export const DELETE: APIRoute = async (context) => thingDeletion(context, "sounds", true);
