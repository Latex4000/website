import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import db from "../../database/db";
import { Tunicwild } from "../../database/schema";
import { eq, type InferSelectModel } from "drizzle-orm";

export const prerender = false;

declare global {
    interface SessionData {
        tunicwilds?: Record<string, {
            guesses: (number | null)[];
            result: boolean | null;
        }>;
    }
}

const audioLengths = [1, 2, 4, 8, 16, 32] as const;

function getAudioUrl(id: number, length: (typeof audioLengths)[number]): string {
    return ""; // TODO
}

export const GET: APIRoute = async (context) => {
    const date = new Date(Number.parseInt(context.url.searchParams.get("timestamp") ?? "", 10));

    if (Number.isNaN(date.getTime())) {
        return jsonError("Invalid timestamp");
    }

    // TODO map from date strings to song IDs
    const dailyTunicwildIds: Record<string, number> = {};

    const tunicwildDateString = date.toISOString().slice(0, 10);
    const tunicwildId = dailyTunicwildIds[tunicwildDateString];

    if (tunicwildId == null) {
        return jsonError("Invalid date. Check if your system clock is set correctly");
    }

    const tunicwild = await db
        .select()
        .from(Tunicwild)
        .where(eq(Tunicwild.id, tunicwildId))
        .get();

    if (tunicwild == null) {
        throw new Error("Missing daily tunicwild in database");
    }

    const tunicwildsSession = context.locals.session.data.tunicwilds?.[tunicwildDateString] ?? {
        guesses: [],
        result: null,
    };
    const responseBody: {
        session: Required<SessionData>["tunicwilds"][string];
        tunicwild: Partial<InferSelectModel<typeof Tunicwild>> & { audioUrl: string };
    } = {
        session: tunicwildsSession,
        tunicwild: {
            audioUrl: getAudioUrl(tunicwild.id, audioLengths[tunicwildsSession.guesses.length] ?? audioLengths[0]),
        },
    };

    if (tunicwildsSession.result != null) {
        Object.assign(responseBody.tunicwild, tunicwild);
    } else {
        const guessCount = tunicwildsSession.guesses.length;

        if (guessCount >= 3) {
            responseBody.tunicwild.releaseDate = tunicwild.releaseDate;
        }

        if (guessCount >= 4) {
            responseBody.tunicwild.extraHint = tunicwild.extraHint;
        }

        if (guessCount >= 5) {
            responseBody.tunicwild.game = tunicwild.game;
        }
    }

    return jsonResponse(responseBody);
};

export const POST: APIRoute = async (context) => {
    const params = await context.request.json();

    if (
        typeof params.timestamp !== "number" ||
        (params.guess != null && typeof params.guess !== "number")
    ) {
        return jsonError("Invalid body");
    }

    const date = new Date(params.timestamp);

    if (Number.isNaN(date.getTime())) {
        return jsonError("Invalid timestamp");
    }

    // TODO map from date strings to song IDs
    const dailyTunicwildIds: Record<string, number> = {};

    const tunicwildDateString = date.toISOString().slice(0, 10);
    const tunicwildId = dailyTunicwildIds[tunicwildDateString];

    if (tunicwildId == null) {
        return jsonError("Invalid date. Check if your system clock is set correctly");
    }

    if (
        params.guess != null &&
        params.guess !== tunicwildId &&
        !await db.$count(Tunicwild, eq(Tunicwild.id, params.guess))
    ) {
        return jsonError("Invalid guess");
    }

    let tunicwildsSession = context.locals.session.data.tunicwilds?.[tunicwildDateString];

    if (tunicwildsSession == null) {
        context.locals.session.data.tunicwilds ??= {};
        tunicwildsSession = context.locals.session.data.tunicwilds[tunicwildDateString] = {
            guesses: [],
            result: null,
        };
    }

    if (tunicwildsSession.result != null || tunicwildsSession.guesses.length >= 6) {
        return jsonError("Tunicwild has already been completed");
    }

    tunicwildsSession.guesses.push(params.guess);

    if (params.guess === tunicwildId) {
        tunicwildsSession.result = true;
    } else if (tunicwildsSession.guesses.length >= 6) {
        tunicwildsSession.result = false;
    }

    const url = new URL(context.url);
    url.searchParams.set("timestamp", params.timestamp.toString());

    // TODO maybe 302 instead
    return context.rewrite(url);
};
