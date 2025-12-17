import { fetchWithHmac } from "@latex4000/fetch-hmac";
import { submissionConfig } from "./config";
import { JsonResponseError } from "../responses";

function getBotBaseUrl(): string {
    const baseUrl = submissionConfig.botBaseUrl;
    if (!baseUrl)
        throw new JsonResponseError("Submission bot endpoint is not configured", 500);
    return baseUrl;
}

function getBotHmacKey(): string {
    const secret = submissionConfig.botHmacKey;
    if (!secret)
        throw new JsonResponseError("SECRET_HMAC_KEY is not configured", 500);
    return secret;
}

async function requestBot<T>(path: string, body: FormData | string | null, headers?: Record<string, string>): Promise<T> {
    const baseUrl = getBotBaseUrl();
    const secret = getBotHmacKey();
    const target = new URL(path, baseUrl);

    let response: Response;
    try {
        response = await fetchWithHmac(secret, target, {
            method: "POST",
            headers,
            body,
        });
    } catch (error) {
        console.error("Failed to contact submission bot", error);
        throw new JsonResponseError("Failed to reach submission service", 502);
    }

    const text = await response.text();
    if (!response.ok) {
        try {
            const payload = JSON.parse(text) as { error?: string };
            throw new JsonResponseError(payload.error ?? "Submission service error", response.status);
        } catch (error) {
            if (error instanceof JsonResponseError)
                throw error;
            throw new JsonResponseError(text || "Submission service error", response.status);
        }
    }

    try {
        return JSON.parse(text) as T;
    } catch (error) {
        console.error("Invalid JSON from submission bot", error);
        throw new JsonResponseError("Invalid response from submission service", 502);
    }
}

export function postJsonToBot<T>(path: string, payload: unknown): Promise<T> {
    const headers = { "Content-Type": "application/json" };
    return requestBot(path, JSON.stringify(payload), headers);
}

export function postFormDataToBot<T>(path: string, formData: FormData): Promise<T> {
    return requestBot(path, formData);
}
