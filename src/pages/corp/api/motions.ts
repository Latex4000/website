import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse, JsonResponseError } from "../../../server/responses";
import { getTags } from "../../../server/validation";
import { Motion } from "../../../database/schema";
import { processMotionSubmission, requireCorpMember, postJsonToSiteApi, tryPostToDiscordFeed } from "../../../server/submissions";
import type { MotionSubmissionResult } from "../../../server/submissions";

export const prerender = false;

function parseBoolean(value: FormDataEntryValue | null, defaultValue: boolean): boolean {
    if (typeof value !== "string")
        return defaultValue;
    return value === "true" || value === "on";
}

function getString(formData: FormData, key: string, required = true): string | null {
    const value = formData.get(key);
    if (typeof value === "string")
        return value.trim();
    if (required)
        throw new Error(`Missing field \"${key}\"`);
    return null;
}

function getFile(formData: FormData, key: string, optional = false): File | null {
    const value = formData.get(key);
    if (value == null && optional)
        return null;
    if (!(value instanceof File) || value.size === 0)
        throw new Error(`Missing file \"${key}\"`);
    return value;
}

export const POST: APIRoute = async (context) => {
    const member = await requireCorpMember(context);

    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    let title: string;
    let description: string;
    let tags: string[];
    let showColour: boolean;
    let allowYoutubeShorts: boolean;
    let confirmInformation: boolean;
    let confirmOwnWork: boolean;
    let video: File;
    let thumbnail: File | null;

    try {
        title = getString(formData, "title")!;
        description = getString(formData, "description", false) ?? "";
        tags = getTags(getString(formData, "tags", false));
        showColour = parseBoolean(formData.get("colour"), true);
        allowYoutubeShorts = parseBoolean(formData.get("allowYoutubeShorts"), false);
        confirmInformation = parseBoolean(formData.get("confirmInformation"), false);
        confirmOwnWork = parseBoolean(formData.get("confirmOwnWork"), false);
        video = getFile(formData, "video")!;
        thumbnail = getFile(formData, "thumbnail", true);
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Invalid form fields");
    }

    if (!title)
        return jsonError("Title is required");

    if (!confirmInformation || !confirmOwnWork)
        return jsonError("Please confirm the submission details and ownership");

    if (tags.join("").length > 2 ** 10)
        return jsonError("Tags are too long");

    let uploads: MotionSubmissionResult;
    try {
        uploads = await processMotionSubmission({
            title,
            description,
            tags,
            hideColour: !showColour,
            allowYoutubeShorts,
            confirmInformation,
            confirmOwnWork,
            video,
            thumbnail,
        });
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to process motion");
    }

    let motion: InferSelectModel<typeof Motion>;
    try {
        motion = await postJsonToSiteApi<InferSelectModel<typeof Motion>>(context, "/api/motions", {
            title,
            youtubeUrl: uploads.youtubeUrl,
            memberDiscord: member.discord,
            tags,
            showColour,
        });
    } catch (error) {
        if (error instanceof JsonResponseError)
            return error.response;
        throw error;
    }

    await tryPostToDiscordFeed(
        `<@${member.discord}> uploaded a motion\nTitle: ${title}\nYouTube: ${uploads.youtubeUrl}`,
    );

    return jsonResponse({ motion, uploads });
};
