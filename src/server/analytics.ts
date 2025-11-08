import type { AstroSharedContext } from "astro";
import { createHash } from "node:crypto";
import db, { retryIfDbBusy } from "../database/db";
import { PageView } from "../database/schema";
import isCrawlerUserAgent from "./isCrawlerUserAgent";

const fingerprintWindowMs = 30 * 1000;
const fingerprints = new Map<string, number>();

declare global {
    namespace App {
        interface Locals {
            /** Don't record this request as a page view for analytics */
            skipRecordPageView?: true;
        }
    }
}

function validForAnalytics(context: AstroSharedContext): boolean {
    if (context.isPrerendered) {
        return false;
    }

    const purposeHeader = context.request.headers.get("Purpose") || context.request.headers.get("Sec-Purpose");
    if (purposeHeader) {
        const normalizedPurpose = purposeHeader.toLowerCase();
        if (normalizedPurpose.includes("prefetch") || normalizedPurpose.includes("prerender")) {
            return false;
        }
    }

    const userAgent = context.request.headers.get("User-Agent");
    if (userAgent != null && isCrawlerUserAgent(userAgent)) {
        return false;
    }

    return true;
}

export async function recordPageView(context: AstroSharedContext, response: Response): Promise<void> {
    if (
        context.locals.skipRecordPageView ||
        !validForAnalytics(context) ||
        context.request.method !== "GET" ||
        context.url.pathname.startsWith("/api/")
    ) {
        return;
    }

    await retryIfDbBusy(() =>
        db.insert(PageView).values({
            path: context.url.pathname,
            status: response.status,
            referrer: context.request.headers.get("Referer"),
        }),
    );
}

// NOTE: If we ever move from single process to multi process then we gotta change this shit
export async function getOnlineVisitorCount(context: AstroSharedContext): Promise<number | null> {
    if (context.isPrerendered) {
        return null;
    }

    if (validForAnalytics(context)) {
        const now = Date.now();

        fingerprints.set(makeFingerprint(context), now);

        for (const [storedFingerprint, lastSeen] of fingerprints) {
            if (lastSeen < now - fingerprintWindowMs) {
                fingerprints.delete(storedFingerprint);
            }
        }
    }

    return fingerprints.size;
}

function makeFingerprint(context: AstroSharedContext): string {
    if (!process.env.ANALYTICS_FINGERPRINT_SECRET) {
        throw new Error("ANALYTICS_FINGERPRINT_SECRET not set");
    }

    const clientIp = context.clientAddress || "unknown";
    const userAgent = context.request.headers.get("User-Agent") ?? "";

    const hash = createHash("sha256");
    hash.update(clientIp);
    hash.update("\n");
    hash.update(userAgent);
    hash.update("\n");
    hash.update(process.env.ANALYTICS_FINGERPRINT_SECRET);

    return hash.digest("base64url");
}
