import type { APIRoute } from "astro";
import { eq, type SQLWrapper } from "drizzle-orm";
import { jsonError } from "../../../server/responses";
import { Tunicwild } from "../../../database/schema";
import { paginationQuery, parseNumberCursor } from "../../../server/pagination";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    const conditions: SQLWrapper[] = [];
    const params = url.searchParams;

    const game = params.get("game");
    if (game)
        conditions.push(eq(Tunicwild.game, game));

    const composer = params.get("composer");
    if (composer)
        conditions.push(eq(Tunicwild.composer, composer));

    const title = params.get("title");
    if (title)
        conditions.push(eq(Tunicwild.title, title));

    const releaseDate = params.get("releaseDate");
    if (releaseDate) {
        const date = new Date(releaseDate);
        if (isNaN(date.getTime()))
            return jsonError("Invalid release date");
        conditions.push(eq(Tunicwild.releaseDate, date));
    }

    return paginationQuery(
        params,
        Tunicwild,
        "id",
        parseNumberCursor,
        ...conditions,
    );
}