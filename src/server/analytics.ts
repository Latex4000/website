import type { APIContext } from "astro";
import { createHash } from "node:crypto";
import { gt, sql } from "drizzle-orm";
import db from "../database/db";
import { PageView } from "../database/schema";

const fingerprintWindowMs = 5 * 60 * 1000;

function shouldRecordPageView(context: APIContext): boolean {
    if (process.env.PRERENDERING) {
        return false;
    }

    if (context.request.method !== "GET") {
        return false;
    }

    const purposeHeader = context.request.headers.get("purpose") ?? context.request.headers.get("sec-purpose");
    if (purposeHeader) {
        const normalizedPurpose = purposeHeader.toLowerCase();
        if (normalizedPurpose.includes("prefetch") || normalizedPurpose.includes("prerender")) {
            return false;
        }
    }

    const pathname = context.url.pathname;

    if (pathname.startsWith("/api/")) {
        return false;
    }

    return true;
}

export async function recordPageView(context: APIContext, response: Response): Promise<void> {
    if (!shouldRecordPageView(context)) {
        return;
    }

    const now = Date.now();
    const fingerprint = makeFingerprint(context, now);

    try {
        await db.insert(PageView).values({
            fingerprint,
            path: context.url.pathname,
            method: context.request.method,
            status: response.status,
            referrer: context.request.headers.get("referer"),
            userAgent: context.request.headers.get("user-agent"),
        });
    } catch (error) {
        console.error("Failed to record page view", error);
    }
}

export async function getOnlineVisitorCount(context: APIContext, windowMs = fingerprintWindowMs): Promise<number> {
    if (process.env.PRERENDERING) {
        return 0;
    }

    const now = Date.now();

    try {
        const fingerprint = makeFingerprint(context, now);
        await db.insert(PageView).values({
            fingerprint,
            path: "__presence__",
            method: "PING",
            status: 200,
            referrer: context.request.headers.get("referer"),
            userAgent: context.request.headers.get("user-agent"),
        });
    } catch (error) {
        console.error("Failed to record presence ping", error);
    }

    const since = new Date(now - windowMs);

    const result = await db
        .select({
            count: sql<number>`count(distinct ${PageView.fingerprint})`,
        })
        .from(PageView)
        .where(gt(PageView.createdAt, since))
        .get();

    return result?.count ?? 0;
}

function makeFingerprint(context: APIContext, timestampMs: number): string {
    if (!process.env.ANALYTICS_FINGERPRINT_SECRET) {
        throw new Error("ANALYTICS_FINGERPRINT_SECRET not set");
    }

    const clientIp = getClientAddress(context);
    const userAgent = context.request.headers.get("user-agent") ?? "";
    const bucket = Math.floor(timestampMs / fingerprintWindowMs).toString(10);

    const hash = createHash("sha256");
    hash.update(clientIp);
    hash.update("\n");
    hash.update(userAgent);
    hash.update("\n");
    hash.update(bucket);
    hash.update("\n");
    hash.update(process.env.ANALYTICS_FINGERPRINT_SECRET);

    return hash.digest("base64url");
}

function getClientAddress(context: APIContext): string {
    const forwardedFor = context.request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const [first] = forwardedFor.split(",");
        if (first) {
            return first.trim();
        }
    }

    const forwarded = context.request.headers.get("forwarded");
    if (forwarded) {
        const match = forwarded.match(/for="?([^;,"]+)/i);
        if (match?.[1]) {
            return match[1];
        }
    }

    const realIp = context.request.headers.get("x-real-ip");
    if (realIp) {
        return realIp;
    }

    const cloudflareIp = context.request.headers.get("cf-connecting-ip");
    if (cloudflareIp) {
        return cloudflareIp;
    }

    const fastlyIp = context.request.headers.get("fastly-client-ip");
    if (fastlyIp) {
        return fastlyIp;
    }

    return "unknown";
}
