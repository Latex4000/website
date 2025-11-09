import type { APIRoute } from "astro";
import {
    getContentCounts,
    getDailyViews,
    getLatestPageViews,
    getPageViewTotals,
    getStatusBreakdown,
    getTopPages,
    getTopReferrers,
    serializeDailyViews,
    serializeLatestPageViews,
    resolveInternalHosts,
    type PageViewFilters,
    type PaginationOptions,
    type WatcherApiResponse,
} from "../../../server/watcher";
import { JsonResponseError, jsonError, jsonResponse } from "../../../server/responses";

export const prerender = false;

function parseDateParam(params: URLSearchParams, key: string): Date | undefined {
    const raw = params.get(key);
    if (!raw) return undefined;
    const value = new Date(raw);
    if (Number.isNaN(value.getTime()))
        throw new JsonResponseError(`Invalid date for "${key}"`);
    return value;
}

function parseBooleanParam(params: URLSearchParams, key: string): boolean | undefined {
    const raw = params.get(key);
    if (raw == null || raw === "") return undefined;

    if (["1", "true", "yes"].includes(raw.toLowerCase())) return true;
    if (["0", "false", "no"].includes(raw.toLowerCase())) return false;

    throw new JsonResponseError(`Invalid boolean for "${key}"`);
}

function parseStatusCodes(params: URLSearchParams): number[] | undefined {
    const rawValues = params.getAll("status");
    if (!rawValues.length) return undefined;

    const codes = new Set<number>();
    for (const rawValue of rawValues) {
        for (const token of rawValue.split(",")) {
            const trimmed = token.trim();
            if (!trimmed)
                continue;
            const parsed = Number.parseInt(trimmed, 10);
            if (Number.isNaN(parsed))
                throw new JsonResponseError(`Invalid status code value "${trimmed}"`);
            codes.add(parsed);
        }
    }

    return codes.size ? Array.from(codes) : undefined;
}

function parsePagination(params: URLSearchParams, prefix: string): PaginationOptions {
    const limitRaw = params.get(`${prefix}Limit`);
    const offsetRaw = params.get(`${prefix}Offset`);

    const pagination: PaginationOptions = {};

    if (limitRaw != null && limitRaw !== "") {
        const parsed = Number.parseInt(limitRaw, 10);
        if (Number.isNaN(parsed) || parsed < 1)
            throw new JsonResponseError(`Invalid ${prefix}Limit`);
        pagination.limit = parsed;
    }

    if (offsetRaw != null && offsetRaw !== "") {
        const parsed = Number.parseInt(offsetRaw, 10);
        if (Number.isNaN(parsed) || parsed < 0)
            throw new JsonResponseError(`Invalid ${prefix}Offset`);
        pagination.offset = parsed;
    }

    return pagination;
}

function withDefaultLimit(pagination: PaginationOptions, defaultLimit: number): PaginationOptions {
    return pagination.limit == null
        ? { ...pagination, limit: defaultLimit }
        : pagination;
}

export const GET: APIRoute = async ({ url }) => {
    try {
        const params = url.searchParams;
        const from = parseDateParam(params, "from");
        const to = parseDateParam(params, "to");
        if (from && to && from > to)
            throw new JsonResponseError("Parameter 'from' must be before 'to'");

        const includeEmptyPath = parseBooleanParam(params, "includeEmptyPath") ?? false;
        const includeInternalReferrers =
            parseBooleanParam(params, "includeInternalReferrers") ?? false;
        const pagePathRaw = params.get("pagePath");
        const pagePath = pagePathRaw && pagePathRaw.trim().length ? pagePathRaw : undefined;
        const referrerQueryRaw = params.get("referrerQuery") ?? params.get("referrer");
        const referrerQuery = referrerQueryRaw && referrerQueryRaw.trim().length ? referrerQueryRaw : undefined;
        const statusCodes = parseStatusCodes(params);

        const internalHostParams = params.getAll("internalHost");
        const internalHostCandidates = internalHostParams
            .flatMap((value) => value.split(","))
            .map((candidate) => candidate.trim())
            .filter(Boolean);
        const internalHosts = !includeInternalReferrers ? resolveInternalHosts([
            ...internalHostCandidates,
            typeof import.meta.env.SITE === "string" ? import.meta.env.SITE : null,
            url.origin,
            url.hostname,
        ]) : [];

        const baseFilters: PageViewFilters = {
            includeEmptyPath,
            internalHosts,
        };
        if (from)
            baseFilters.from = from;
        if (to)
            baseFilters.to = to;
        if (pagePath)
            baseFilters.pagePath = pagePath;
        if (statusCodes)
            baseFilters.statusCodes = statusCodes;
        if (referrerQuery)
            baseFilters.referrerQuery = referrerQuery;

        const topPagesPagination = withDefaultLimit(parsePagination(params, "topPages"), 10);
        const latestPagination = withDefaultLimit(parsePagination(params, "latest"), 20);
        const referrersPagination = withDefaultLimit(parsePagination(params, "referrers"), 10);
        const statusPagination = withDefaultLimit(parsePagination(params, "status"), 10);

        const [totals, contentCounts, dailyViews, topPages, latestPageViews, topReferrers, statusBreakdown] =
            await Promise.all([
                getPageViewTotals(baseFilters),
                getContentCounts(),
                getDailyViews(baseFilters),
                getTopPages(baseFilters, topPagesPagination),
                getLatestPageViews(baseFilters, latestPagination),
                getTopReferrers(baseFilters, referrersPagination),
                getStatusBreakdown(baseFilters, statusPagination),
            ]);

        const timezoneOffsetMinutesRaw = params.get("timezoneOffset");
        const timezoneOffsetMinutes = timezoneOffsetMinutesRaw ? Number.parseInt(timezoneOffsetMinutesRaw, 10) : undefined;
        if (timezoneOffsetMinutesRaw && Number.isNaN(timezoneOffsetMinutes))
            throw new JsonResponseError("Invalid timezoneOffset");

        const fromIso = from ? from.toISOString() : null;
        const toIso = to ? to.toISOString() : null;

        const payload: WatcherApiResponse = {
            serverNow: new Date().toISOString(),
            filters: {
                from: fromIso,
                to: toIso,
                pagePath: pagePath ?? null,
                statusCodes: statusCodes ?? [],
                referrerQuery: referrerQuery ?? null,
                includeEmptyPath,
                internalHosts,
                timezoneOffsetMinutes: timezoneOffsetMinutes ?? null,
            },
            results: {
                totals,
                contentCounts,
                dailyViews: serializeDailyViews(dailyViews),
                topPages,
                latestPageViews: serializeLatestPageViews(latestPageViews),
                topReferrers,
                statusBreakdown,
            },
            pagination: {
                topPages: topPagesPagination,
                latest: latestPagination,
                referrers: referrersPagination,
                status: statusPagination,
            },
        };

        return jsonResponse(payload);
    } catch (error) {
        if (error instanceof JsonResponseError)
            return error.response;

        console.error("Failed to fetch analytics data", error);
        return jsonError("Unable to retrieve analytics data", 500);
    }
};
