import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { db, Sound } from "astro:db";
import { soundFromDb, type SoundType } from "../../../db/config";
import { mkdir } from "fs/promises";
import { createWriteStream, ReadStream } from "fs";
import { execFileSync } from "child_process";
import { finished } from "stream/promises";
import { extname } from "path";

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
    const track = formData.get("track");
    const cover = formData.get("cover");
    const tags = formData.get("tags") ?? "";

    // Form validation
    if (
        typeof title !== "string" ||
        typeof youtubeUrl !== "string" ||
        !URL.canParse(youtubeUrl) ||
        !(track instanceof File) ||
        !(cover instanceof File) ||
        typeof tags !== "string"
    ) {
        return jsonError("Invalid form params");
    }

    if (soundcloudUrl && (
        typeof soundcloudUrl !== "string" ||
        !URL.canParse(soundcloudUrl))) {
        return jsonError("Invalid SoundCloud URL");
    }

    if (tags.length > 2 ** 10) {
        return jsonError("Tags are too long");
    }

    // File validation
    if (track.name !== "track.mp3" && track.name !== "track.wav") {
        return jsonError("Invalid track name or extension");
    }

    if (cover.name !== "cover.jpg" && cover.name !== "cover.png") {
        return jsonError("Invalid cover name or extension");
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
                    tags:
                        tags.length === 0
                            ? []
                            : tags.split(",").map((tag) => tag.trim()),
                    trackType: extname(track.name).slice(1),
                    coverType: extname(cover.name).slice(1),
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

    for (const file of [track, cover]) {
        await finished(
            ReadStream.fromWeb(file.stream()).pipe(
                createWriteStream(`${directory}/${file.name}`),
            ),
        );
    }

    if (process.env.SOUNDS_RUN_AFTER_UPLOAD != null) {
        execFileSync(process.env.SOUNDS_RUN_AFTER_UPLOAD, [directory], {
            stdio: "ignore",
        });
    }

    return jsonResponse(sound);
};
