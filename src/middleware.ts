import { validateHmac } from "@latex4000/fetch-hmac";
import type { MiddlewareHandler } from "astro";
import { defineMiddleware, sequence } from "astro:middleware";
import { jsonError, ResponseError } from "./server/responses";
import { openAsBlob } from "fs";
import { loadSession, saveSession } from "./server/session";
import { recordPageView } from "./server/analytics";

const checkHmacForApi = defineMiddleware(async (context, next) => {
    if (!context.url.pathname.startsWith("/api/")) {
        return next();
    }

    if (
        context.request.method === "GET" && (
            context.url.pathname.startsWith("/api/action") ||
            context.url.pathname.startsWith("/api/analytics")
        )
    ) {
        return next();
    }

    if (!process.env.SECRET_HMAC_KEY) {
        return jsonError("SECRET_HMAC_KEY not set", 500);
    }

    let valid: boolean;
    try {
        valid = await validateHmac(process.env.SECRET_HMAC_KEY, context.request);
    } catch (error) {
        console.error(error);
        return jsonError("Internal error when validating HMAC", 500);
    }

    if (!valid) {
        return jsonError("Invalid HMAC", 401);
    }

    return next();
});

const handleResponseErrors = defineMiddleware(async (_, next) => {
    try {
        return await next();
    } catch (error) {
        if (error instanceof ResponseError) {
            return error.response;
        }

        throw error;
    }
});

const loadAndSaveSession = defineMiddleware(async (context, next) => {
    await loadSession(context);
    const response = await next();
    await saveSession(context);
    return response;
});

const serveUploadedFilesInDev = defineMiddleware(async (context, next) => {
    if (!process.env.SIGHTS_UPLOAD_DIRECTORY) {
        return new Response("SIGHTS_UPLOAD_DIRECTORY not set", { status: 500 });
    }

    if (!process.env.SOUNDS_UPLOAD_DIRECTORY) {
        return new Response("SOUNDS_UPLOAD_DIRECTORY not set", { status: 500 });
    }

    if (!process.env.WORDS_UPLOAD_DIRECTORY) {
        return new Response("WORDS_UPLOAD_DIRECTORY not set", { status: 500 });
    }

    const rewrites = [
        ["/sights-uploads/", process.env.SIGHTS_UPLOAD_DIRECTORY + "/"],
        ["/sounds-uploads/", process.env.SOUNDS_UPLOAD_DIRECTORY + "/"],
        ["/words-uploads/", process.env.WORDS_UPLOAD_DIRECTORY + "/"],
    ] as const;

    for (const [from, to] of rewrites) {
        if (context.url.pathname.startsWith(from)) {
            try {
                return new Response(
                    await openAsBlob(
                        to + context.url.pathname.slice(from.length),
                    ),
                );
            } catch (error) {
                return new Response("", { status: 404 });
            }
        }
    }

    return next();
});

const updateAnalytics = defineMiddleware(async (context, next) => {
    const response = await next();

    try {
        await recordPageView(context, response);
    } catch (error) {
        console.error("Error recording page view:", error);
        // No need to signal this to the user
    }

    return response;
});

const handlers: MiddlewareHandler[] = [];

if (process.env.NODE_ENV === "development") {
    handlers.push(serveUploadedFilesInDev);
}

if (!process.env.PRERENDERING) {
    handlers.push(updateAnalytics);
}

handlers.push(handleResponseErrors, checkHmacForApi);

if (!process.env.PRERENDERING) {
    handlers.push(loadAndSaveSession);
}

export const onRequest = sequence(...handlers);
