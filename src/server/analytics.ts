import type { APIContext } from "astro";
import { createHash } from "node:crypto";
import db, { retryIfDbBusy } from "../database/db";
import { PageView } from "../database/schema";

const fingerprintWindowMs = 30 * 1000;
const fingerprints = new Map<string, number>();

function shouldRecordPageView(context: APIContext): boolean {
    if (context.isPrerendered) {
        return false;
    }

    if (context.request.method !== "GET") {
        return false;
    }

    const purposeHeader = context.request.headers.get("Purpose") || context.request.headers.get("Sec-Purpose");
    if (purposeHeader) {
        const normalizedPurpose = purposeHeader.toLowerCase();
        if (normalizedPurpose.includes("prefetch") || normalizedPurpose.includes("prerender")) {
            return false;
        }
    }

    if (context.url.pathname.startsWith("/api/")) {
        return false;
    }

    return true;
}

export async function recordPageView(context: APIContext, response: Response): Promise<void> {
    if (!shouldRecordPageView(context)) {
        return;
    }

    const now = new Date();

    await retryIfDbBusy(() =>
        db.insert(PageView).values({
            path: context.url.pathname,
            status: response.status,
            referrer: context.request.headers.get("Referer"),
            createdAt: now,
        }),
    );
}

export async function getOnlineVisitorCount(context: APIContext, windowMs = fingerprintWindowMs): Promise<number | null> {
    if (context.isPrerendered) {
        return null;
    }

    const now = Date.now();
    const fingerprint = makeFingerprint(context);
    const cutoff = now - windowMs;

    fingerprints.set(fingerprint, now);

    for (const [storedFingerprint, lastSeen] of fingerprints) {
        if (lastSeen < cutoff) {
            fingerprints.delete(storedFingerprint);
        }
    }

    return fingerprints.size;
}

function makeFingerprint(context: APIContext): string {
    if (!process.env.ANALYTICS_FINGERPRINT_SECRET) {
        throw new Error("ANALYTICS_FINGERPRINT_SECRET not set");
    }

    const clientIp = getClientAddress(context);
    const userAgent = context.request.headers.get("User-Agent") ?? "";

    const hash = createHash("sha256");
    hash.update(clientIp);
    hash.update("\n");
    hash.update(userAgent);
    hash.update("\n");
    hash.update(process.env.ANALYTICS_FINGERPRINT_SECRET);

    return hash.digest("base64url");
}

function getClientAddress(context: APIContext): string {
    return context.request.headers.get("X-Real-IP") || context.clientAddress;
}
