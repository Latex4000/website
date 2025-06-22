import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import db from "../../database/db";
import { Tunicwild } from "../../database/schema";
import { eq, type InferSelectModel } from "drizzle-orm";
import { readFile } from "node:fs/promises";

export const prerender = false;

if (!process.env.TUNICWILDS_DAILY_FILE) {
    throw new Error("TUNICWILDS_DAILY_FILE not set");
}

declare global {
    interface SessionData {
        tunicwilds?: Record<string, {
            guesses: ({
                id: number;
                result: "correct" | "correctGame" | "correctTitle" | "incorrect";
            } | null)[];
            result: boolean | null;
        }>;
    }
}

interface DailyInfo {
    active: {
        audioFilenames: string[];
        date: string;
        id: number;
    }[];
    recentIds: number[];
    startDate: string;
}

export const GET: APIRoute = async (context) => {
    const date = new Date(Number.parseInt(context.url.searchParams.get("timestamp") ?? "", 10));

    if (Number.isNaN(date.getTime())) {
        return jsonError("Invalid timestamp");
    }

    const dailyInfo: DailyInfo = JSON.parse(await readFile(process.env.TUNICWILDS_DAILY_FILE!, "utf8"));
    const tunicwildDateString = date.toISOString().slice(0, 10);
    const tunicwildInfo = dailyInfo.active.find((info) => info.date === tunicwildDateString);

    if (tunicwildInfo == null) {
        return jsonError("Invalid date. Check if your system clock is set correctly");
    }

    const tunicwild = await db
        .select()
        .from(Tunicwild)
        .where(eq(Tunicwild.id, tunicwildInfo.id))
        .get();

    if (tunicwild == null) {
        throw new Error("Missing daily tunicwild in database");
    }

    const tunicwildsSession = context.locals.session.data.tunicwilds?.[tunicwildDateString] ?? {
        guesses: [],
        result: null,
    };
    const responseBody: {
        fourFourFiveEnabled: boolean;
        session: Required<SessionData>["tunicwilds"][string];
        tunicwild: Partial<InferSelectModel<typeof Tunicwild>> & { audioUrl: string };
    } = {
        fourFourFiveEnabled: context.locals.session.data.memberDiscord != null,
        session: tunicwildsSession,
        tunicwild: {
            audioUrl: `/tunicwilds-rendered/${tunicwildInfo.audioFilenames[
                tunicwildsSession.result != null
                    ? tunicwildInfo.audioFilenames.length - 1
                    : tunicwildsSession.guesses.length
            ]}`,
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

        if (
            guessCount >= 5 ||
            tunicwildsSession.guesses.some((guess) => guess?.result === "correctGame")
        ) {
            responseBody.tunicwild.game = tunicwild.game;
        }

        if (tunicwildsSession.guesses.some((guess) => guess?.result === "correctTitle")) {
            responseBody.tunicwild.title = tunicwild.title;
        }
    }

    return jsonResponse(responseBody);
};

export const POST: APIRoute = async (context) => {
    const params: Partial<Record<keyof any, unknown>> = await context.request.json();

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

    const dailyInfo: DailyInfo = JSON.parse(await readFile(process.env.TUNICWILDS_DAILY_FILE!, "utf8"));
    const tunicwildDateString = date.toISOString().slice(0, 10);
    const tunicwildId = dailyInfo.active.find((info) => info.date === tunicwildDateString)?.id;

    if (tunicwildId == null) {
        return jsonError("Invalid date. Check if your system clock is set correctly");
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

    const tunicwild = await db
        .select()
        .from(Tunicwild)
        .where(eq(Tunicwild.id, tunicwildId))
        .get();

    if (tunicwild == null) {
        throw new Error("Missing daily tunicwild in database");
    }

    const guessedTunicwild = params.guess == null ? null : await db
        .select()
        .from(Tunicwild)
        .where(eq(Tunicwild.id, params.guess))
        .get();

    if (params.guess != null && guessedTunicwild == null) {
        return jsonError("Invalid guess");
    }

    tunicwildsSession.guesses.push(params.guess == null ? null : {
        id: params.guess,
        result: params.guess === tunicwildId
            ? "correct"
            : guessedTunicwild?.game === tunicwild.game
                ? "correctGame"
                : guessedTunicwild?.title === tunicwild.title
                    ? "correctTitle"
                    : "incorrect",
    });

    if (params.guess === tunicwildId) {
        tunicwildsSession.result = true;
    } else if (tunicwildsSession.guesses.length >= 6) {
        tunicwildsSession.result = false;
    }

    // TODO delete older games from session

    const url = new URL(context.url);
    url.searchParams.set("timestamp", params.timestamp.toString());

    return context.redirect(url.toString(), 302);
};
