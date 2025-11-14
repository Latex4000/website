import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse, JsonResponseError } from "../../../server/responses";
import { getTags } from "../../../server/validation";
import { Sound } from "../../../database/schema";
import { processSoundSubmission, requireCorpMember, postFormDataToSiteApi, tryPostToDiscordFeed } from "../../../server/submissions";
import type { SoundSubmissionResult } from "../../../server/submissions";

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

function getFile(formData: FormData, key: string): File {
    const value = formData.get(key);
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
    let genre: string;
    let description: string;
    let tags: string[];
    let showColour: boolean;
    let allowYoutubeShorts: boolean;
    let allowVerticalCover: boolean;
    let confirmInformation: boolean;
    let confirmOwnWork: boolean;
    let audio: File;
    let image: File;
    let video: File | null;

    try {
        title = getString(formData, "title")!;
        genre = getString(formData, "genre")!;
        description = getString(formData, "description", false) ?? "";
        tags = getTags(getString(formData, "tags", false));
        showColour = parseBoolean(formData.get("colour"), true);
        allowYoutubeShorts = parseBoolean(formData.get("allowYoutubeShorts"), false);
        allowVerticalCover = parseBoolean(formData.get("allowVerticalCover"), false);
        confirmInformation = parseBoolean(formData.get("confirmInformation"), false);
        confirmOwnWork = parseBoolean(formData.get("confirmOwnWork"), false);
        audio = getFile(formData, "audio");
        image = getFile(formData, "image");
        const videoValue = formData.get("video");
        video = videoValue instanceof File && videoValue.size > 0 ? videoValue : null;
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Invalid form fields");
    }

    if (!confirmInformation || !confirmOwnWork)
        return jsonError("Please confirm the submission details and ownership");

    let uploads: SoundSubmissionResult;
    try {
        uploads = await processSoundSubmission({
            memberDiscord: member.discord,
            title,
            genre,
            description,
            tags,
            hideColour: !showColour,
            allowYoutubeShorts,
            allowVerticalCover,
            confirmInformation,
            confirmOwnWork,
            audio,
            image,
            video,
        });
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to process sound submission");
    }

    const upstreamForm = new FormData();
    upstreamForm.set("discord", member.discord);
    upstreamForm.set("title", title);
    if (uploads.soundcloudUrl)
        upstreamForm.set("soundcloudUrl", uploads.soundcloudUrl);
    if (uploads.youtubeUrl)
        upstreamForm.set("youtubeUrl", uploads.youtubeUrl);
    upstreamForm.set("track", audio);
    upstreamForm.set("cover", image);
    const dbTags = [genre, ...tags].map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    if (dbTags.length > 0)
        upstreamForm.set("tags", dbTags.join(","));
    upstreamForm.set("colour", showColour ? "true" : "false");

    let sound: InferSelectModel<typeof Sound>;
    try {
        sound = await postFormDataToSiteApi<InferSelectModel<typeof Sound>>(context, "/api/sounds", upstreamForm);
    } catch (error) {
        if (error instanceof JsonResponseError)
            return error.response;
        throw error;
    }

    const feedLines = [
        `<@${member.discord}> uploaded a sound`,
        `Title: ${title}`,
    ];
    if (uploads.youtubeUrl)
        feedLines.push(`YouTube: ${uploads.youtubeUrl}`);
    if (uploads.soundcloudUrl)
        feedLines.push(`SoundCloud: ${uploads.soundcloudUrl}`);

    await tryPostToDiscordFeed(feedLines.join("\n"));

    return jsonResponse({ sound, uploads });
};
