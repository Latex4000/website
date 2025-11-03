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

    await db.insert(PageView).values({
        fingerprint: makeFingerprint(context, now),
        path: context.url.pathname,
        status: response.status,
        referrer: context.request.headers.get("Referer"),
        userAgent: context.request.headers.get("User-Agent"),
        memberDiscord: context.locals.session.data.memberDiscord,
        address: getClientAddress(context),
        createdAt: now,
    });
}

export async function getOnlineVisitorCount(context: APIContext, windowMs = fingerprintWindowMs): Promise<number> {
    if (process.env.PRERENDERING) {
        return 0;
    }

    const now = new Date();

    try {
        await db.insert(PageView).values({
            fingerprint: makeFingerprint(context, now),
            path: "",
            status: 0,
            referrer: context.request.headers.get("Referer"),
            userAgent: context.request.headers.get("User-Agent"),
            memberDiscord: context.locals.session.data.memberDiscord,
            address: getClientAddress(context),
            createdAt: now,
        });
    } catch (error) {
        console.error("Failed to record presence ping", error);
    }

    const since = new Date(now.getTime() - windowMs);
    const result = await db
        .select({
            count: sql<number>`count(distinct ${PageView.fingerprint})`,
        })
        .from(PageView)
        .where(gt(PageView.createdAt, since))
        .get();

    return result?.count ?? 0;
}

function makeFingerprint(context: APIContext, date: Date): string {
    if (!process.env.ANALYTICS_FINGERPRINT_SECRET) {
        throw new Error("ANALYTICS_FINGERPRINT_SECRET not set");
    }

    const clientIp = getClientAddress(context);
    const userAgent = context.request.headers.get("User-Agent") ?? "";
    const bucket = Math.floor(date.getTime() / fingerprintWindowMs).toString(10);

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
    return context.request.headers.get("X-Real-IP") || context.clientAddress;
}
