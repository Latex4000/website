import { fetchWithHmac } from "@latex4000/fetch-hmac";
import type { APIContext } from "astro";
import { JsonResponseError } from "../responses";

function getSecretKey(): string {
    const key = process.env.SECRET_HMAC_KEY;
    if (!key)
        throw new JsonResponseError("SECRET_HMAC_KEY not set", 500);
    return key;
}

export async function postJsonToSiteApi<T>(context: APIContext, path: string, payload: unknown): Promise<T> {
    const url = new URL(path, context.url);
    const response = await fetchWithHmac(getSecretKey(), url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return parseJsonResponse<T>(response);
}

export async function postFormDataToSiteApi<T>(context: APIContext, path: string, formData: FormData): Promise<T> {
    const url = new URL(path, context.url);
    const response = await fetchWithHmac(getSecretKey(), url, {
        method: "POST",
        body: formData,
    });

    return parseJsonResponse<T>(response);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    if (!response.ok) {
        try {
            const payload = JSON.parse(text);
            throw new JsonResponseError(payload.error ?? "Upstream API error", response.status);
        } catch {
            throw new JsonResponseError(text || "Upstream API error", response.status);
        }
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new JsonResponseError("Invalid JSON from upstream API", 500);
    }
}
