import { LibsqlError } from "@libsql/client";
import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse } from "../../server/responses";
import { mkdir } from "fs/promises";
import { createWriteStream, ReadStream } from "fs";
import { execFileSync } from "child_process";
import { finished } from "stream/promises";
import { thingDeletion, thingGet } from "../../server/thingUtils";
import db from "../../database/db";
import { Sight } from "../../database/schema";

export const prerender = false;

const fileSizeLimit = 2 ** 20;

export const GET: APIRoute = async (context) => thingGet(context, "sights");

export const POST: APIRoute = async (context) => {
    if (!process.env.SIGHTS_UPLOAD_DIRECTORY) {
        return jsonError("SIGHTS_UPLOAD_DIRECTORY not set", 500);
    }

    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    const discord = formData.get("discord");
    const title = formData.get("title");
    const description = formData.get("description");
    const tags = formData.get("tags") ?? "";
    const assetFiles = formData.getAll("assets") as File[];
    const pixelated = formData.get("pixelated") === "true";
    const showColour = formData.get("colour") === "true";

    // Form validation
    if (
        typeof discord !== "string" ||
        typeof title !== "string" ||
        typeof description !== "string" ||
        typeof tags !== "string" ||
        assetFiles.some((value) => !(value instanceof File))
    ) {
        return jsonError("Invalid form params");
    }

    if (title.length > 2 ** 10) {
        return jsonError("Title is too long");
    }

    if (description.length > 2 ** 10) {
        return jsonError("Description is too long");
    }

    if (tags.length > 2 ** 10) {
        return jsonError("Tags are too long");
    }

    // File validation
    for (const file of assetFiles) {
        if (file.size > fileSizeLimit) {
            return jsonError(
                `File "${file.name}" is too large (${file.size / 2 ** 10}KiB > ${fileSizeLimit / 2 ** 10}KiB)`,
            );
        }
    }

    // Check if files are images only, they may be application/octet-stream as well, so we need to check the type
    if (
        assetFiles.some(
            (file) => !file.type.startsWith("image/") && file.type !== "application/octet-stream" && (!file.name.endsWith(".png") || !file.name.endsWith(".jpg") || !file.name.endsWith(".jpeg") || !file.name.endsWith(".gif") || !file.name.endsWith(".webp"))
        )
    ) {
        return jsonError(
            'Cannot upload asset files that are not images',
        );
    }

    // Store to DB
    let sight: InferSelectModel<typeof Sight>;
    try {
        sight = await db
            .insert(Sight)
            .values({
                memberDiscord: discord,
                tags:
                    tags.length === 0
                        ? []
                        : tags.split(",").map((tag) => tag.trim()),
                title,
                description,
                showColour,
                pixelated,
            })
            .returning()
            .get();
    } catch (error) {
        if (error instanceof LibsqlError) {
            if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
                return jsonError("Sight already exists");
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
    const directory = `${process.env.SIGHTS_UPLOAD_DIRECTORY}/${sight.id}`;

    await mkdir(directory);
    for (const file of assetFiles) {
        await finished(
            ReadStream.fromWeb(file.stream()).pipe(
                createWriteStream(`${directory}/${file.name}`),
            ),
        );
    }

    if (process.env.SIGHTS_RUN_AFTER_UPLOAD) {
        execFileSync(process.env.SIGHTS_RUN_AFTER_UPLOAD, [directory], {
            stdio: "ignore",
        });
    }

    return jsonResponse(sight);
};

export const PUT: APIRoute = async (context) => thingDeletion(context, "sights", false);

export const DELETE: APIRoute = async (context) => thingDeletion(context, "sights", true);
