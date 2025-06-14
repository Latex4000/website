import { LibsqlError } from "@libsql/client";
import type { APIRoute } from "astro";
import { eq, type InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse } from "../../server/responses";
import { mkdir, writeFile } from "fs/promises";
import { createWriteStream, ReadStream } from "fs";
import { Marked } from "marked";
import { baseUrl as markedBaseUrl } from "marked-base-url";
import { markedEmoji } from "marked-emoji";
import { execFileSync } from "child_process";
import { finished } from "stream/promises";
import { thingDeletion, thingGet } from "../../server/thingUtils";
import { serverHTMLPurify } from "../../components/DOMPurify/server";
import { getMap } from "../../data/emoji";
import db, { retryIfDbBusy } from "../../database/db";
import { Member, Tunicwild } from "../../database/schema";

export const prerender = false;


export const GET: APIRoute = async (context) => thingGet(context, "tunicwilds");

export const POST: APIRoute = async (context) => {
    if (!process.env.TUNICWILDS_DIRECTORY) {
        return jsonError("TUNICWILDS_DIRECTORY not set", 500);
    }

    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    const discord = formData.get("discord");
    const composer = formData.get("composer");
    const title = formData.get("title");
    const game = formData.get("game");
    const releaseDate = formData.get("releaseDate");
    const extraHint = formData.get("extraHint");
    const file = formData.get("file") as File;

    // Form validation
    if (
        typeof discord !== "string" ||
        typeof composer !== "string" ||
        typeof title !== "string" ||
        typeof game !== "string" ||
        typeof releaseDate !== "string" ||
        typeof extraHint !== "string" ||
        !(file instanceof File)
    ) {
        return jsonError("Invalid form params");
    }
    const releaseDateParsed = new Date(releaseDate);
    if (isNaN(releaseDateParsed.getTime())) {
        return jsonError("Invalid release date");
    }
    if (releaseDateParsed.getTime() > Date.now()) {
        return jsonError("Release date cannot be in the future");
    }

    if (file.size > fileSizeLimit) {
        return jsonError("File size exceeds limit of 1 MB");
    }

    const member = await db
        .select()
        .from(Member)
        .where(eq(Member.discord, discord))
        .get();
    if (!member) {
        return jsonError("Member does not exist");
    }

    if (member.deleted) {
        return jsonError("Member has been deleted");
    }

    if (composer.length > 2 ** 10) {
        return jsonError("Composer name is too long");
    }
    if (title.length > 2 ** 10) {
        return jsonError("Title is too long");
    }
    if (game.length > 2 ** 10) {
        return jsonError("Game name is too long");
    }
    if (extraHint.length > 2 ** 10) {
        return jsonError("Extra hint is too long");
    }

    // File validation
    if (!file.name.endsWith(".ogg") && !file.name.endsWith(".opus") && !file.name.endsWith(".wav") && !file.name.endsWith(".mp3")) {
        return jsonError("File must be an OGG, Opus, WAV, or MP3 file");
    }

    // Store to DB
    let tunicwild: InferSelectModel<typeof Tunicwild>;
    try {
        tunicwild = await retryIfDbBusy(() =>
            db
                .insert(Tunicwild)
                .values({
                    memberDiscord: discord,
                    composer,
                    title,
                    game,
                    releaseDate: releaseDateParsed,
                    extraHint,
                })
                .returning()
                .get()
        );
    } catch (error) {
        if (error instanceof LibsqlError) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                return jsonError("Word already exists");
            }

            if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
                return jsonError(
                    "Invalid Discord ID; member does not exist; probably needs to join first",
                );
            }
        }

        throw error;
    }

    // Upload files
    ReadStream.fromWeb(file.stream()).pipe(
        createWriteStream(`${process.env.TUNICWILDS_DIRECTORY}/${tunicwild.id}.${file.name.split('.').pop()}`),
    )
};

export const PUT: APIRoute = async (context) => thingDeletion(context, "tunicwilds", false);

export const DELETE: APIRoute = async (context) => thingDeletion(context, "tunicwilds", true);