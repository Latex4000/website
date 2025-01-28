import { validateHmac } from "@latex4000/fetch-hmac";
import { defineMiddleware, sequence } from "astro:middleware";
import { jsonError, ResponseError } from "./server/responses";
import { openAsBlob } from "fs";

const checkHmacForApi = defineMiddleware((context, next) => {
    if (!context.url.pathname.startsWith("/api/")) {
        return next();
    }

    if (!process.env.SECRET_HMAC_KEY) {
        return jsonError("SECRET_HMAC_KEY not set", 500);
    }

    return validateHmac(process.env.SECRET_HMAC_KEY, context.request)
        .then((valid) => (valid ? next() : jsonError("Invalid HMAC", 401)))
        .catch((error) => {
            console.error(error);
            return jsonError("Internal error when validating HMAC", 500);
        });
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

const serveUploadedFilesInDev = defineMiddleware(async (context, next) => {
    if (!process.env.SOUNDS_UPLOAD_DIRECTORY) {
        return new Response("SOUNDS_UPLOAD_DIRECTORY not set", { status: 500 });
    }

    if (!process.env.WORDS_UPLOAD_DIRECTORY) {
        return new Response("WORDS_UPLOAD_DIRECTORY not set", { status: 500 });
    }

    const rewrites = [
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

const handlers = [handleResponseErrors, checkHmacForApi];

if (process.env.NODE_ENV === "development") {
    handlers.push(serveUploadedFilesInDev);
}

export const onRequest = sequence(...handlers);
