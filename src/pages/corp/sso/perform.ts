import type { APIRoute } from "astro";
import { jsonError } from "../../../server/responses";

export const prerender = false;

export const POST: APIRoute = async (context) => {
    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    const username = formData.get("username");
    const ticket = formData.get("ticket");

    if (typeof username !== "string" || !username) {
        return jsonError("Invalid form params");
    }

    if (typeof ticket !== "string" || !ticket) {
        return context.redirect("begin?e=Password authentication is unavailable. Please use a ticket.", 302);
    }

    // TODO
    return new Response("Not implemented", { status: 500 });
};
