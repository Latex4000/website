import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import db from "../../database/db";
import { Tunicwild } from "../../database/schema";
import { eq, type InferSelectModel } from "drizzle-orm";

export const prerender = false;

declare global {
    interface SessionData {
        tunicwilds?: Record<string, {
            complete: boolean;
            guesses: number[];
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

    const tunicwildsSession = context.locals.session.data.tunicwilds?.[tunicwildDateString];
    const responseBody: Partial<InferSelectModel<typeof Tunicwild>> & { audioUrl: string } = {
        audioUrl: getAudioUrl(tunicwild.id, audioLengths[tunicwildsSession?.guesses.length ?? 0] ?? audioLengths[0]),
    };

    if (tunicwildsSession != null) {
        if (tunicwildsSession.complete) {
            Object.assign(responseBody, tunicwild);
        } else {
            const guessCount = tunicwildsSession.guesses.length;

            if (guessCount >= 3) {
                responseBody.releaseDate = tunicwild.releaseDate;
            }

            if (guessCount >= 4) {
                responseBody.extraHint = tunicwild.extraHint;
            }

            if (guessCount >= 5) {
                responseBody.game = tunicwild.game;
            }
        }
    }

    return jsonResponse(responseBody);
};
