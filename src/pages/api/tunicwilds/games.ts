import type { APIRoute } from "astro";
import db from "../../../database/db";
import { Tunicwild } from "../../../database/schema";
import { jsonResponse } from "../../../server/responses";

export const prerender = false;

export const GET: APIRoute = async () => {
    return jsonResponse(
        await db
            .select({
                game: Tunicwild.game
            })
            .from(Tunicwild)
            .groupBy(Tunicwild.game)
            .orderBy(Tunicwild.game),
    );
};
