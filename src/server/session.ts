import { hash, randomBytes } from "node:crypto";
import type { APIContext } from "astro";
import { and, eq, gt, type InferSelectModel } from "drizzle-orm";
import db, { retryIfDbBusy } from "../database/db";
import { Session } from "../database/schema";

declare global {
    namespace App {
        interface Locals {
            // Technically both are optional, but middleware will set them very early in the request lifecycle and it's more convenient to type like this
            session: InferSelectModel<typeof Session>;
            sessionRawId: string;
        }
    }
}

export interface SessionData {
    memberDiscord?: string;
}

const cookieName = "latex_session";
const maxAgeMs = 1000 * 60 * 60 * 24 * 30;

export async function loadSession(context: APIContext): Promise<void> {
    const sessionRawId = context.cookies.get(cookieName)?.value;

    if (sessionRawId) {
        const session = await db
            .select()
            .from(Session)
            .where(and(
                eq(Session.id, hash("sha256", Buffer.from(sessionRawId, "base64url"), "base64")),
                gt(Session.expiresAt, new Date()),
            ))
            .get();

        if (session != null) {
            context.locals.sessionRawId = sessionRawId;
            context.locals.session = session;
            return;
        }
    }

    const sessionBytes = randomBytes(32);

    context.locals.sessionRawId = sessionBytes.toString("base64url");
    context.locals.session = {
        id: hash("sha256", sessionBytes, "base64"),
        expiresAt: new Date(Date.now() + maxAgeMs),
        data: {},
    };
}

export async function saveSession(context: APIContext): Promise<void> {
    context.locals.session.expiresAt = new Date(Date.now() + maxAgeMs);

    await retryIfDbBusy(() =>
        db
            .insert(Session)
            .values(context.locals.session)
            .onConflictDoUpdate({
                target: Session.id,
                set: context.locals.session,
            }),
    );

    context.cookies.set(cookieName, context.locals.sessionRawId, {
        domain: (process.env.CORPORATE_URL ? context.site! : context.url).hostname,
        httpOnly: true,
        expires: context.locals.session.expiresAt,
        path: "/",
        sameSite: "lax",
        secure: import.meta.env.PROD,
    });
}
