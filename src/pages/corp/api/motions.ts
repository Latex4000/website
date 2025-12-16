import type { APIRoute } from "astro";
import type { InferSelectModel } from "drizzle-orm";
import { jsonError, jsonResponse, JsonResponseError } from "../../../server/responses";
import { Motion } from "../../../database/schema";
import { postFormDataToBot, requireCorpMember } from "../../../server/submissions";

export const prerender = false;

export const POST: APIRoute = async (context) => {
    const member = await requireCorpMember(context);

    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    formData.set("discord", member.discord);

    try {
        const payload = await postFormDataToBot<{
            motion: InferSelectModel<typeof Motion>;
            uploads: { youtubeUrl: string };
        }>("/things/motions", formData);
        return jsonResponse(payload);
    } catch (error) {
        if (error instanceof JsonResponseError)
            return error.response;
        throw error;
    }
};
