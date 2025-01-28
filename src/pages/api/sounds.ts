import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { db, Sound } from "astro:db";
import { soundFromDb, type SoundType } from "../../../db/config";
import { mkdir } from "fs/promises";
import { execFileSync } from "child_process";
import { extname } from "path";
import { getFileOrDiscordAttachment, getTags } from "../../server/validation";
import { writeBlobToFile } from "../../server/webApi";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    if (process.env.SOUNDS_UPLOAD_DIRECTORY == null) {
        return jsonError("SOUNDS_UPLOAD_DIRECTORY not set", 500);
    }

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    // TODO
    // const discord = formData.get("discord");
    const title = formData.get("title");
    const soundcloudUrl = formData.get("soundcloudUrl");
    const youtubeUrl = formData.get("youtubeUrl");
    const track = await getFileOrDiscordAttachment(formData.get("track"));
    const cover = await getFileOrDiscordAttachment(formData.get("cover"));
    const tags = formData.get("tags") ?? "";

    // Form validation
    if (
        typeof title !== "string" ||
        typeof soundcloudUrl !== "string" ||
        !URL.canParse(soundcloudUrl) ||
        typeof youtubeUrl !== "string" ||
        !URL.canParse(youtubeUrl) ||
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
    let sound: SoundType;
    try {
        sound = soundFromDb(
            await db
                .insert(Sound)
                .values({
                    title,
                    soundcloudUrl,
                    youtubeUrl,
                    tags: getTags(tags),
                    trackType,
                    coverType,
                })
                .returning()
                .get(),
        );
    } catch (error) {
        // TODO
        // if (isDbError(error) && error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
        // 	return jsonError("Invalid Discord ID");
        // }

        throw error;
    }

    // Upload files
    const directory = `${process.env.SOUNDS_UPLOAD_DIRECTORY}/${sound.id}`;

    await mkdir(directory);

    await writeBlobToFile(`${directory}/track.${trackType}`, track);
    await writeBlobToFile(`${directory}/cover.${coverType}`, cover);

    if (process.env.SOUNDS_RUN_AFTER_UPLOAD != null) {
        execFileSync(process.env.SOUNDS_RUN_AFTER_UPLOAD, [directory], {
            stdio: "ignore",
        });
    }

    return jsonResponse(sound);
};
