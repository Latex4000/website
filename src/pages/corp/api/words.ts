import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse, JsonResponseError } from "../../../server/responses";
import { getTags } from "../../../server/validation";
import { Word } from "../../../database/schema";
import { wordId } from "../../../database/db";
import { extractWordAssets, requireCorpMember, postFormDataToSiteApi, tryPostToDiscordFeed, requireSiteUrl } from "../../../server/submissions";

export const prerender = false;

const fileSizeLimit = 2 ** 20;

function parseBoolean(value: FormDataEntryValue | null, defaultValue: boolean): boolean {
    if (typeof value !== "string")
        return defaultValue;
    return value === "true" || value === "on";
}

function getString(formData: FormData, key: string): string {
    const value = formData.get(key);
    if (typeof value !== "string" || value.trim().length === 0)
        throw new Error(`Missing field \"${key}\"`);
    return value.trim();
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
    let markdown: string;
    let tags: string[];
    let showColour: boolean;
    let confirmInformation: boolean;
    let confirmOwnWork: boolean;
    let assetsZip: File | null;

    try {
        title = getString(formData, "title");
        markdown = getString(formData, "md");
        tags = getTags(formData.get("tags") as string | null);
        showColour = parseBoolean(formData.get("colour"), true);
        confirmInformation = parseBoolean(formData.get("confirmInformation"), false);
        confirmOwnWork = parseBoolean(formData.get("confirmOwnWork"), false);
        const assetsValue = formData.get("assets");
        assetsZip = assetsValue instanceof File && assetsValue.size > 0 ? assetsValue : null;
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Invalid form fields");
    }

    if (!confirmInformation || !confirmOwnWork)
        return jsonError("Please confirm the submission details and ownership");

    if (markdown.length > fileSizeLimit)
        return jsonError("Markdown content is too long");

    let extractedAssets: Awaited<ReturnType<typeof extractWordAssets>>;
    try {
        extractedAssets = await extractWordAssets(assetsZip);
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to process assets");
    }

    const upstreamForm = new FormData();
    upstreamForm.set("discord", member.discord);
    upstreamForm.set("title", title);
    upstreamForm.set("md", markdown);
    if (tags.length > 0)
        upstreamForm.set("tags", tags.join(","));
    upstreamForm.set("colour", showColour ? "true" : "false");

    for (const file of extractedAssets.files)
        upstreamForm.append("assets", file);

    let word: InferSelectModel<typeof Word>;
    try {
        word = await postFormDataToSiteApi<InferSelectModel<typeof Word>>(context, "/api/words", upstreamForm);
    } catch (error) {
        if (error instanceof JsonResponseError)
            return error.response;
        throw error;
    }

    const slug = wordId(word);
    const feedLink = requireSiteUrl(`/words/${slug}`);
    await tryPostToDiscordFeed(
        `<@${member.discord}> uploaded a word\nLink: ${feedLink}`,
    );

    return jsonResponse({ word });
};
