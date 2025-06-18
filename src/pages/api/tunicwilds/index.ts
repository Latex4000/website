import { LibsqlError } from "@libsql/client";
import type { APIRoute } from "astro";
import { and, eq, type InferSelectModel, type SQLWrapper } from "drizzle-orm";
import { jsonError, jsonResponse } from "../../../server/responses";
import { createWriteStream, ReadStream } from "fs";
import db, { retryIfDbBusy } from "../../../database/db";
import { Tunicwild } from "../../../database/schema";
import { paginationQuery, parseNumberCursor } from "../../../server/pagination";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    const conditions: SQLWrapper[] = [];
    const params = url.searchParams;

    const game = params.get("game");
    if (game)
        conditions.push(eq(Tunicwild.game, game));

    const composer = params.get("composer");
    if (composer)
        conditions.push(eq(Tunicwild.composer, composer));

    const title = params.get("title");
    if (title)
        conditions.push(eq(Tunicwild.title, title));

    const releaseDate = params.get("releaseDate");
    if (releaseDate) {
        const date = new Date(releaseDate);
        if (isNaN(date.getTime()))
            return jsonError("Invalid release date");
        conditions.push(eq(Tunicwild.releaseDate, date));
    }

    return paginationQuery(
        params,
        Tunicwild,
        "id",
        parseNumberCursor,
        ...conditions,
    );
}

export const POST: APIRoute = async (context) => {
    if (process.env.NODE_ENV === "development" && !process.env.TUNICWILDS_DIRECTORY) {
        return jsonError("TUNICWILDS_DIRECTORY not set", 500);
    }

    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    const composer = formData.get("composer");
    const title = formData.get("title");
    const game = formData.get("game");
    const releaseDate = formData.get("releaseDate");
    const extraHint = formData.get("extraHint");
    const file = formData.get("file") as File;

    if (typeof composer !== "string" || !composer.trim()) {
        return jsonError("Composer is required");
    }
    if (typeof title !== "string" || !title.trim()) {
        return jsonError("Title is required");
    }
    if (typeof game !== "string" || !game.trim()) {
        return jsonError("Game is required");
    }
    if (typeof releaseDate !== "string" || !releaseDate.trim()) {
        return jsonError("Release date is required");
    }
    if (typeof extraHint !== "string") {
        return jsonError("Extra hint is required");
    }
    if (!(file instanceof File) || file.size === 0) {
        return jsonError("Valid audio file is required");
    }

    // Parse and validate release date
    const releaseDateParsed = new Date(releaseDate);
    if (isNaN(releaseDateParsed.getTime())) {
        return jsonError("Invalid release date format. Use YYYY-MM-DD or ISO format");
    }
    if (releaseDateParsed.getTime() > Date.now()) {
        return jsonError("Release date cannot be in the future");
    }

    // Length validation with better limits
    const MAX_LENGTH = 2 ** 10;
    if (composer.length > MAX_LENGTH) {
        return jsonError(`Composer name too long (max ${MAX_LENGTH} characters)`);
    }
    if (title.length > MAX_LENGTH) {
        return jsonError(`Title too long (max ${MAX_LENGTH} characters)`);
    }
    if (game.length > MAX_LENGTH) {
        return jsonError(`Game name too long (max ${MAX_LENGTH} characters)`);
    }
    if (extraHint.length > MAX_LENGTH) {
        return jsonError(`Extra hint too long (max ${MAX_LENGTH} characters)`);
    }

    // File validation with size limits
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
        return jsonError("File too large (max 50MB)");
    }

    // More robust file type checking
    const allowedExtensions = [".ogg", ".opus", ".wav", ".mp3"];
    const allowedMimeTypes = ["audio/ogg", "audio/opus", "audio/wav", "audio/mpeg", "audio/mp3"];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const isValidExtension = allowedExtensions.includes(fileExtension);
    const isValidMimeType = allowedMimeTypes.includes(file.type.toLowerCase());

    if (!isValidExtension && !isValidMimeType) {
        return jsonError("File must be an OGG, Opus, WAV, or MP3 file");
    }

    // Check for duplicates with case-insensitive comparison
    const existingTunicwild = await db
        .select()
        .from(Tunicwild)
        .where(
            and(
                eq(Tunicwild.title, title.trim()),
                eq(Tunicwild.game, game.trim())
            )
        )
        .get();

    if (existingTunicwild) {
        return jsonError(`A song with title "${title}" already exists in game "${game}"`);
    }

    // Store to DB
    let tunicwild: InferSelectModel<typeof Tunicwild>;
    try {
        tunicwild = await retryIfDbBusy(() =>
            db
                .insert(Tunicwild)
                .values({
                    composer: composer.trim(),
                    title: title.trim(),
                    game: game.trim(),
                    releaseDate: releaseDateParsed,
                    extraHint: extraHint.trim(),
                })
                .returning()
                .get()
        );
    } catch (error) {
        if (error instanceof LibsqlError) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                return jsonError("A song with this title and game already exists");
            }
            if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
                return jsonError("Invalid foreign key constraint");
            }
        }
        console.error("Database error:", error);
        return jsonError("Failed to save song to database", 500);
    }

    // Upload files with better error handling
    try {
        if (process.env.NODE_ENV === "development") {
            // Get file extension properly
            const extension = fileExtension.substring(1); // Remove the dot
            const filePath = `${process.env.TUNICWILDS_DIRECTORY}/${tunicwild.id}.${extension}`;

            const fileStream = file.stream();
            const writeStream = createWriteStream(filePath);

            // Convert web stream to node stream properly
            const reader = fileStream.getReader();
            const pump = async () => {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        writeStream.write(Buffer.from(value));
                    }
                    writeStream.end();
                } catch (error) {
                    writeStream.destroy();
                    throw error;
                }
            };

            await pump();
        } else {
            const uploadResponse = await fetch(
                `${process.env.TUNICWILDS_URL}/upload/${encodeURIComponent(game)}/${encodeURIComponent(title)}`,
                {
                    method: "POST",
                    body: file.stream(),
                    headers: {
                        "Content-Type": file.type || "audio/mpeg",
                        "Content-Length": file.size.toString(),
                    },
                }
            );

            if (!uploadResponse.ok) {
                // Rollback database entry if file upload fails
                await db.delete(Tunicwild).where(eq(Tunicwild.id, tunicwild.id));
                return jsonError(`Failed to upload file: ${uploadResponse.statusText}`, 500);
            }
        }
    } catch (error) {
        console.error("File upload error:", error);
        // Rollback database entry if file upload fails
        try {
            await db.delete(Tunicwild).where(eq(Tunicwild.id, tunicwild.id));
        } catch (rollbackError) {
            console.error("Failed to rollback database entry:", rollbackError);
        }
        return jsonError("Failed to upload audio file", 500);
    }

    return jsonResponse(tunicwild);
};