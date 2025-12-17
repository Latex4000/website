import { fetchWithHmac } from "@latex4000/fetch-hmac";
import type { APIContext } from "astro";
import { eq } from "drizzle-orm";
import db from "../database/db";
import { Member } from "../database/schema";
import { JsonResponseError } from "./responses";

const botBaseUrl = process.env.SUBMISSION_BOT_BASE_URL ?? "http://localhost:5556";
const botHmacKey = process.env.SECRET_HMAC_KEY ?? null;

function getBotBaseUrl(): string {
    const baseUrl = botBaseUrl;
    if (!baseUrl)
        throw new JsonResponseError("Submission bot endpoint is not configured", 500);
    return baseUrl;
}

function getBotHmacKey(): string {
    const secret = botHmacKey;
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

export async function requireCorpMember(context: APIContext) {
    const discord = context.locals.session.data.memberDiscord;
    if (!discord)
        throw new JsonResponseError("Not authenticated", 401);

    const member = await db
        .select()
        .from(Member)
        .where(eq(Member.discord, discord))
        .get();

    if (!member)
        throw new JsonResponseError("Member does not exist", 403);

    if (member.deleted)
        throw new JsonResponseError("Member has been deleted", 403);

    return member;
}