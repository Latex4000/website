import { hash, randomBytes } from "node:crypto";
import { LibsqlError } from "@libsql/client";
import type { APIRoute } from "astro";
import db, { retryIfDbBusy } from "../../database/db";
import { Ticket } from "../../database/schema";
import { jsonError, jsonResponse } from "../../server/responses";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const params = await request.json();

    if (
        typeof params.memberDiscord !== "string" ||
        !params.memberDiscord
    ) {
        return jsonError("Invalid body");
    }

    const ticket = randomBytes(20);

    try {
        await retryIfDbBusy(() =>
            db
                .insert(Ticket)
                .values({
                    hash: hash("sha256", ticket, "base64"),
                    memberDiscord: params.memberDiscord,
                })
                .returning()
                .get(),
        );
    } catch (error) {
        if (error instanceof LibsqlError && error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
            return jsonError("Invalid Discord ID");
        }

        throw error;
    }

    return jsonResponse(ticket.toString("base64url"));
};
