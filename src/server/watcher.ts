import type { AstroSharedContext } from "astro";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import db, { retryIfDbBusy } from "../database/db";
import isBlockedReferrerHost from "./isBlockedReferrer";
import isCrawlerUserAgent from "./isCrawlerUserAgent";
import {
    Action,
    Member,
    Motion,
    PageView,
    Sight,
    Sound,
    Subscriber,
    Word,
} from "../database/schema";
import {
    and,
    desc,
    eq,
    gte,
    inArray,
    isNotNull,
    like,
    lte,
    ne,
    sql,
    type SQL,
} from "drizzle-orm";

export interface PageViewFilters {
    from?: Date;
    to?: Date;
    pagePath?: string | null;
    statusCodes?: number[];
    referrerQuery?: string | null;
    includeEmptyPath?: boolean;
    internalHosts?: string[];
}

export interface PaginationOptions {
    limit?: number;
    offset?: number;
}

export interface PaginatedResult<T> {
    rows: T[];
    total: number;
    limit: number;
    offset: number;
}

export interface TotalsResult {
    overall: number;
    filtered: number;
    comparisons: Record<string, number>;
}

export interface ContentCounts {
    members: number;
    subscribers: number;
    actions: number;
    sounds: number;
    motions: number;
    sights: number;
    words: number;
}

export interface LatestPageViewRow {
    path: string;
    status: number;
    referrer: string | null;
    createdAt: Date;
}

const DEFAULT_PAGE_LIMIT = 25;
const MAX_PAGE_LIMIT = 200;

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

function combineConditions(...conditions: (SQL | undefined)[]): SQL | undefined {
    const filtered = conditions.filter(Boolean) as SQL[];
    if (!filtered.length) return undefined;
    if (filtered.length === 1) return filtered[0]!;
    return and(...filtered);
}

function normalizeHostCandidate(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const prepared = trimmed.startsWith("http")
        ? trimmed
        : trimmed.startsWith("//")
            ? `https:${trimmed}`
            : `https://${trimmed}`;

    try {
        const url = new URL(prepared);
        return url.hostname.toLowerCase();
    } catch {
        return null;
    }
}

function expandHostVariants(candidate: string | null | undefined): string[] {
    const host = normalizeHostCandidate(candidate);
    if (!host) return [];

    const variants = new Set<string>();
    variants.add(host);
    if (host.startsWith("www.")) {
        variants.add(host.slice(4));
    } else {
        variants.add(`www.${host}`);
    }

    return Array.from(variants).filter(Boolean);
}

export function resolveInternalHosts(
    candidates: Array<string | null | undefined>,
): string[] {
    const hosts = new Set<string>();
    for (const candidate of candidates) {
        for (const host of expandHostVariants(candidate)) {
            if (host) {
                hosts.add(host);
            }
        }
    }
    return Array.from(hosts);
}

function buildInternalReferrerExclusionClause(
    filters: PageViewFilters = {},
): SQL | undefined {
    if (!filters.internalHosts || !filters.internalHosts.length)
        return undefined;

    const hostList = filters.internalHosts.map((host) => normalizeHostCandidate(host))
        .filter((host): host is string => Boolean(host));

    const clauses: SQL[] = [
        sql`substr(${PageView.referrer}, 1, 1) = '/'`,
    ];

    for (const host of new Set(hostList)) {
        clauses.push(sql`instr(lower(${PageView.referrer}), ${`://${host}`}) > 0`);
        clauses.push(sql`instr(lower(${PageView.referrer}), ${`//${host}`}) > 0`);
    }

    let internalCondition: SQL | undefined;
    for (const clause of clauses) {
        internalCondition = internalCondition
            ? sql`${internalCondition} OR ${clause}`
            : clause;
    }

    if (!internalCondition) return undefined;

    return sql`NOT (${internalCondition})`;
}

function buildReferrerWhereClause(
    filters: PageViewFilters = {},
): SQL | undefined {
    const baseCondition = combineConditions(
        buildPageViewWhereClause(filters),
        isNotNull(PageView.referrer),
        ne(PageView.referrer, ""),
    );

    const internalExclusion = buildInternalReferrerExclusionClause(filters);
    return combineConditions(baseCondition, internalExclusion);
}

function normalizePagination(options: PaginationOptions = {}): { limit: number; offset: number } {
    const limit = Math.min(Math.max(options.limit ?? DEFAULT_PAGE_LIMIT, 1), MAX_PAGE_LIMIT);
    const offset = Math.max(options.offset ?? 0, 0);
    return { limit, offset };
}

function buildPageViewWhereClause(filters: PageViewFilters = {}): SQL | undefined {
    const includeEmptyPath = filters.includeEmptyPath ?? false;
    const conditions: (SQL | undefined)[] = [];

    if (!includeEmptyPath) {
        conditions.push(ne(PageView.path, ""));
    }

    if (filters.from) {
        conditions.push(gte(PageView.createdAt, filters.from));
    }

    if (filters.to) {
        conditions.push(lte(PageView.createdAt, filters.to));
    }

    if (filters.pagePath && filters.pagePath.trim()) {
        const trimmed = filters.pagePath.trim();
        const hasWildcard = /[%_*]/.test(trimmed);
        conditions.push(hasWildcard ? like(PageView.path, trimmed) : eq(PageView.path, trimmed));
    }

    if (filters.statusCodes && filters.statusCodes.length) {
        const uniqueStatusCodes = Array.from(new Set(filters.statusCodes));
        conditions.push(inArray(PageView.status, uniqueStatusCodes));
    }

    if (filters.referrerQuery && filters.referrerQuery.trim()) {
        const pattern = `%${filters.referrerQuery.trim()}%`;
        conditions.push(like(PageView.referrer, pattern));
    }

    return combineConditions(...conditions);
}

async function countPageViews(filters: PageViewFilters = {}): Promise<number> {
    const condition = buildPageViewWhereClause(filters);
    const query = db.select({ count: sql<number>`count(*)` }).from(PageView);
    const row = await (condition ? query.where(condition) : query).get();
    return row?.count ?? 0;
}

async function countDistinctPaths(filters: PageViewFilters = {}): Promise<number> {
    const condition = buildPageViewWhereClause(filters);
    const query = db.select({ count: sql<number>`count(DISTINCT ${PageView.path})` }).from(PageView);
    const row = await (condition ? query.where(condition) : query).get();
    return row?.count ?? 0;
}

async function countDistinctReferrers(filters: PageViewFilters = {}): Promise<number> {
    const condition = buildReferrerWhereClause(filters);
    const query = db.select({ count: sql<number>`count(DISTINCT ${PageView.referrer})` }).from(PageView);
    const row = await (condition ? query.where(condition) : query).get();
    return row?.count ?? 0;
}

async function countDistinctStatuses(filters: PageViewFilters = {}): Promise<number> {
    const condition = buildPageViewWhereClause(filters);
    const query = db.select({ count: sql<number>`count(DISTINCT ${PageView.status})` }).from(PageView);
    const row = await (condition ? query.where(condition) : query).get();
    return row?.count ?? 0;
}

function pruneFingerprints(now: number, windowMs: number): void {
    const cutoff = now - windowMs;
    for (const [storedFingerprint, lastSeen] of fingerprints) {
        if (lastSeen < cutoff) {
            fingerprints.delete(storedFingerprint);
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

function shouldSkipPageViewForReferrer(referrer: string | null): boolean {
    if (!referrer)
        return false;

    const host = normalizeHostCandidate(referrer);

    if (!host)
        return true;

    if (isIP(host))
        return true;

    if (isBlockedReferrerHost(host))
        return true;

    // Add checks as we need them here basically

    return false;
}

export async function recordPageView(context: AstroSharedContext, response: Response): Promise<void> {
    // This special response header will be present on the entire rewrite stack, so to filter out rewrites we additionally check if the origin pathname is different from the current pathname. This would be incorrect in cases where the origin pathname actually does appear further into the rewrite stack but I can't figure out how to differentiate rewrites from normal requests at that point, and hopefully it'll never come up...
    if (
        response.headers.has("X-Astro-Rewrite") &&
        context.originPathname !== new URL(context.request.url).pathname
    ) {
        return;
    }

    if (
        context.locals.skipRecordPageView ||
        !validForAnalytics(context) ||
        context.request.method !== "GET" ||
        context.url.pathname.startsWith("/api/")
    ) {
        return;
    }

    const rawReferrer = context.request.headers.get("Referer");
    const referrer = rawReferrer && rawReferrer.trim().length ? rawReferrer.trim() : null;
    if (shouldSkipPageViewForReferrer(referrer))
        return;

    const fields = {
        path: context.url.pathname,
        status: response.status,
        referrer,
    };

    if (!context.isPrerendered) {
        const fingerprint = makeFingerprint(context);
        const nowStamp = Date.now();
        fingerprints.set(fingerprint, nowStamp);
        pruneFingerprints(nowStamp, fingerprintWindowMs);
    }

    await retryIfDbBusy(() =>
        db.insert(PageView).values(fields),
    );
}

export async function getPageViewTotals(
    filters: PageViewFilters = {},
    presetDurations: Record<string, number> = {
        last24Hours: 24 * 60 * 60 * 1000,
        last7Days: 7 * 24 * 60 * 60 * 1000,
        last30Days: 30 * 24 * 60 * 60 * 1000,
    },
): Promise<TotalsResult> {
    const overall = await countPageViews();
    const filtered = await countPageViews(filters);

    const comparisonFilters: PageViewFilters = { ...filters };
    delete comparisonFilters.from;
    delete comparisonFilters.to;

    const comparisonsEntries = await Promise.all(
        Object.entries(presetDurations).map(async ([label, duration]) => {
            const to = new Date();
            const from = new Date(to.getTime() - duration);
            const value = await countPageViews({
                ...comparisonFilters,
                from,
                to,
            });
            return [label, value] as const;
        }),
    );

    return {
        overall,
        filtered,
        comparisons: Object.fromEntries(comparisonsEntries),
    };
}

export async function getContentCounts(): Promise<ContentCounts> {
    const [members, subscribers, actions, sounds, motions, sights, words] = await Promise.all([
        db
            .select({ count: sql<number>`count(*)` })
            .from(Member)
            .where(eq(Member.deleted, false))
            .get(),
        db
            .select({ count: sql<number>`count(*)` })
            .from(Subscriber)
            .where(isNotNull(Subscriber.verifiedAt))
            .get(),
        db
            .select({ count: sql<number>`count(*)` })
            .from(Action)
            .where(eq(Action.deleted, false))
            .get(),
        db
            .select({ count: sql<number>`count(*)` })
            .from(Sound)
            .where(eq(Sound.deleted, false))
            .get(),
        db
            .select({ count: sql<number>`count(*)` })
            .from(Motion)
            .where(eq(Motion.deleted, false))
            .get(),
        db
            .select({ count: sql<number>`count(*)` })
            .from(Sight)
            .where(eq(Sight.deleted, false))
            .get(),
        db
            .select({ count: sql<number>`count(*)` })
            .from(Word)
            .where(eq(Word.deleted, false))
            .get(),
    ]);

    return {
        members: members?.count ?? 0,
        subscribers: subscribers?.count ?? 0,
        actions: actions?.count ?? 0,
        sounds: sounds?.count ?? 0,
        motions: motions?.count ?? 0,
        sights: sights?.count ?? 0,
        words: words?.count ?? 0,
    };
}

export async function getTopPages(
    filters: PageViewFilters = {},
    pagination: PaginationOptions = {},
): Promise<PaginatedResult<{ path: string; views: number }>> {
    const { limit, offset } = normalizePagination(pagination);
    const condition = buildPageViewWhereClause(filters);
    const countExpr = sql<number>`count(*)`;

    const baseQuery = db
        .select({
            path: PageView.path,
            views: countExpr,
        })
        .from(PageView);

    const rows = await (condition ? baseQuery.where(condition) : baseQuery)
        .groupBy(PageView.path)
        .orderBy(desc(countExpr))
        .limit(limit)
        .offset(offset);

    const total = await countDistinctPaths(filters);

    return {
        rows,
        total,
        limit,
        offset,
    };
}

export async function getLatestPageViews(
    filters: PageViewFilters = {},
    pagination: PaginationOptions = {},
): Promise<PaginatedResult<LatestPageViewRow>> {
    const { limit, offset } = normalizePagination(pagination);
    const condition = buildPageViewWhereClause(filters);

    const baseQuery = db
        .select({
            path: PageView.path,
            status: PageView.status,
            referrer: PageView.referrer,
            createdAt: PageView.createdAt,
        })
        .from(PageView);

    const rows = await (condition ? baseQuery.where(condition) : baseQuery)
        .orderBy(desc(PageView.createdAt))
        .limit(limit)
        .offset(offset);

    const total = await countPageViews(filters);

    return {
        rows,
        total,
        limit,
        offset,
    };
}

export type ViewBucket = "hour" | "day" | "week";

const viewBucketDurations: Record<ViewBucket, number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
};

function normalizeViewBucket(candidate: ViewBucket | null | undefined): ViewBucket {
    if (candidate === "hour" || candidate === "week") return candidate;
    return "day";
}

function getBucketAlignmentSeconds(bucket: ViewBucket): number {
    switch (bucket) {
        case "week":
            return 3 * 24 * 60 * 60; // align buckets to start on Mondays
        case "hour":
        case "day":
        default:
            return 0;
    }
}

export async function getDailyViews(
    filters: PageViewFilters = {},
    options: { timezoneOffsetMinutes?: number; bucket?: ViewBucket } = {},
): Promise<Array<{ date: Date; views: number }>> {
    const condition = buildPageViewWhereClause(filters);
    const rawOffset = options.timezoneOffsetMinutes ?? 0;
    const timezoneOffsetMinutes = Number.isFinite(rawOffset)
        ? Math.trunc(rawOffset)
        : 0;
    const bucket = normalizeViewBucket(options.bucket);

    const bucketSeconds = Math.floor(viewBucketDurations[bucket] / 1000);
    const offsetSeconds = timezoneOffsetMinutes * 60;
    const alignmentSeconds = getBucketAlignmentSeconds(bucket);

    const bucketExpr = sql<number>`CAST(((CAST(strftime('%s', ${PageView.createdAt}) AS INTEGER) - ${offsetSeconds}) + ${alignmentSeconds}) / ${bucketSeconds} AS INTEGER)`;
    const countExpr = sql<number>`count(*)`;

    const baseQuery = db
        .select({
            bucket: bucketExpr,
            views: countExpr,
        })
        .from(PageView);

    const rows = await (condition ? baseQuery.where(condition) : baseQuery)
        .groupBy(bucketExpr)
        .orderBy(bucketExpr);

    const timezoneShiftMs = timezoneOffsetMinutes * 60 * 1000;
    const alignmentMs = alignmentSeconds * 1000;
    const bucketDurationMs = viewBucketDurations[bucket];

    return rows
        .map((row) => {
            const bucketIndex = row.bucket;
            const localBucketStartMs = bucketIndex * bucketDurationMs - alignmentMs;
            const utcStartMs = localBucketStartMs + timezoneShiftMs;
            const shifted = new Date(utcStartMs);
            return {
                date: shifted,
                views: row.views,
            };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function getTopReferrers(
    filters: PageViewFilters = {},
    pagination: PaginationOptions = {},
): Promise<PaginatedResult<{ referrer: string; views: number }>> {
    const { limit, offset } = normalizePagination(pagination);
    const condition = buildReferrerWhereClause(filters);
    const countExpr = sql<number>`count(*)`;

    const baseQuery = db
        .select({
            referrer: PageView.referrer,
            views: countExpr,
        })
        .from(PageView);

    const rows = await (condition ? baseQuery.where(condition) : baseQuery)
        .groupBy(PageView.referrer)
        .orderBy(desc(countExpr))
        .limit(limit)
        .offset(offset);

    const total = await countDistinctReferrers(filters);

    return {
        rows: rows.map((row) => ({
            referrer: row.referrer ?? "",
            views: row.views,
        })),
        total,
        limit,
        offset,
    };
}

export async function getStatusBreakdown(
    filters: PageViewFilters = {},
    pagination: PaginationOptions = {},
): Promise<PaginatedResult<{ status: number; views: number }>> {
    const { limit, offset } = normalizePagination(pagination);
    const condition = buildPageViewWhereClause(filters);
    const countExpr = sql<number>`count(*)`;

    const baseQuery = db
        .select({
            status: PageView.status,
            views: countExpr,
        })
        .from(PageView);

    const rows = await (condition ? baseQuery.where(condition) : baseQuery)
        .groupBy(PageView.status)
        .orderBy(desc(countExpr))
        .limit(limit)
        .offset(offset);

    const total = await countDistinctStatuses(filters);

    return {
        rows,
        total,
        limit,
        offset,
    };
}

export function serializeDailyViews(
    points: Array<{ date: Date; views: number }>,
) {
    return points.map((point) => ({
        date: point.date.toISOString(),
        views: point.views,
    }));
}

export function serializeLatestPageViews(
    result: PaginatedResult<LatestPageViewRow>,
) {
    return {
        ...result,
        rows: result.rows.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
        })),
    };
}

export type WatcherDailyViews = ReturnType<typeof serializeDailyViews>;
export type WatcherLatestPageViews = ReturnType<typeof serializeLatestPageViews>;

export type WatcherApiResponse = {
    serverNow: string;
    filters: {
        from: string | null;
        to: string | null;
        pagePath: string | null;
        statusCodes: number[];
        referrerQuery: string | null;
        includeEmptyPath: boolean;
        internalHosts: string[];
        timezoneOffsetMinutes: number | null;
        bucket: ViewBucket;
    };
    results: {
        totals: TotalsResult;
        contentCounts: ContentCounts;
        dailyViews: WatcherDailyViews;
        topPages: PaginatedResult<{ path: string; views: number }>;
        latestPageViews: WatcherLatestPageViews;
        topReferrers: PaginatedResult<{ referrer: string; views: number }>;
        statusBreakdown: PaginatedResult<{ status: number; views: number }>;
    };
    pagination: Record<
        "topPages" | "latest" | "referrers" | "status",
        PaginationOptions
    >;
};

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
