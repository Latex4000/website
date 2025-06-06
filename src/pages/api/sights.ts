import { LibsqlError } from "@libsql/client";
import type { APIRoute } from "astro";
import { eq, type InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse } from "../../server/responses";
import { execFileSync } from "child_process";
import { thingDeletion, thingGet } from "../../server/thingUtils";
import db, { retryIfDbBusy } from "../../database/db";
import type { Sharp } from "sharp";
import { Member, Sight } from "../../database/schema";
import { getSightSharpInstance, processSightImage } from "../../server/thumbnail-sights";

export const prerender = false;

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
        assetFiles.length === 0 ||
        assetFiles.some((value) => !(value instanceof File))
    ) {
        return jsonError("Invalid form params");
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

    if (title.length > 2 ** 10) {
        return jsonError("Title is too long");
    }

    if (description.length > 2 ** 10) {
        return jsonError("Description is too long");
    }

    if (tags.length > 2 ** 10) {
        return jsonError("Tags are too long");
    }

    const filesWithInfo: [File, Sharp, "gif" | "jpeg" | "png"][] = [];

    for (const file of assetFiles) {
        try {
            filesWithInfo.push([file, ...await getSightSharpInstance(file)]);
        } catch {
            return jsonError(`File "${file.name}" is not a valid image`);
        }
    }

    // Store to DB
    let sight: InferSelectModel<typeof Sight>;
    try {
        sight = await retryIfDbBusy(() =>
            db
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
                .get()
        );
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

    for (const [file, sharpInstance, sharpFormat] of filesWithInfo) {
        await processSightImage(sight, directory, file, sharpInstance, sharpFormat);
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
