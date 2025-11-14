import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse, JsonResponseError } from "../../../server/responses";
import { getTags } from "../../../server/validation";
import { Sight } from "../../../database/schema";
import { expandSightAssets, requireCorpMember, postFormDataToSiteApi, tryPostToDiscordFeed, requireSiteUrl } from "../../../server/submissions";

export const prerender = false;

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
    let description: string;
    let tags: string[];
    let pixelated: boolean;
    let showColour: boolean;
    let confirmInformation: boolean;
    let confirmOwnWork: boolean;
    let assets: File[];

    try {
        title = getString(formData, "title");
        description = getString(formData, "description");
        tags = getTags(formData.get("tags") as string | null);
        pixelated = parseBoolean(formData.get("pixelated"), false);
        showColour = parseBoolean(formData.get("colour"), true);
        confirmInformation = parseBoolean(formData.get("confirmInformation"), false);
        confirmOwnWork = parseBoolean(formData.get("confirmOwnWork"), false);
        const assetEntries = formData.getAll("assets");
        if (!assetEntries.length)
            throw new Error("At least one asset is required");
        const files: File[] = [];
        for (const entry of assetEntries) {
            if (!(entry instanceof File) || entry.size === 0)
                throw new Error("Invalid asset provided");
            files.push(entry);
        }
        const expanded = await expandSightAssets(files);
        assets = expanded.files;
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Invalid form fields");
    }

    if (!confirmInformation || !confirmOwnWork)
        return jsonError("Please confirm the submission details and ownership");

    const upstreamForm = new FormData();
    upstreamForm.set("discord", member.discord);
    upstreamForm.set("title", title);
    upstreamForm.set("description", description);
    if (tags.length > 0)
        upstreamForm.set("tags", tags.join(","));
    upstreamForm.set("pixelated", pixelated ? "true" : "false");
    upstreamForm.set("colour", showColour ? "true" : "false");
    for (const file of assets)
        upstreamForm.append("assets", file);

    let sight: InferSelectModel<typeof Sight>;
    try {
        sight = await postFormDataToSiteApi<InferSelectModel<typeof Sight>>(context, "/api/sights", upstreamForm);
    } catch (error) {
        if (error instanceof JsonResponseError)
            return error.response;
        throw error;
    }

    await tryPostToDiscordFeed(
        `<@${member.discord}> uploaded a sight\nLink: ${requireSiteUrl("/sights")}`,
    );

    return jsonResponse({ sight });
};
