import { hash } from "node:crypto";
import type { APIRoute } from "astro";
import { and, eq, lt, or } from "drizzle-orm";
import db from "../../../database/db";
import { Member, Ticket } from "../../../database/schema";
import { jsonError } from "../../../server/responses";

export const prerender = false;

export const POST: APIRoute = async (context) => {
    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    const username = formData.get("username");
    const ticketParam = formData.get("ticket");

    if (typeof username !== "string" || !username) {
        return jsonError("Invalid form params");
    }

    if (typeof ticketParam !== "string" || !ticketParam) {
        return context.redirect("begin?e=Password authentication is unavailable. Please use a ticket.", 302);
    }

    const ticketAndMember = await db
        .select({
            memberDiscord: Member.discord,
            ticket: Ticket,
        })
        .from(Ticket)
        .innerJoin(Member, eq(Ticket.memberDiscord, Member.discord))
        .where(and(
            eq(Member.alias, username),
            eq(Ticket.hash, hash("sha256", Buffer.from(ticketParam, "base64url"), "base64")),
        ))
        .get();

    if (ticketAndMember == null) {
        return context.redirect("begin?e=Invalid username or ticket.", 302);
    }

    const { memberDiscord, ticket } = ticketAndMember;

    if (ticket.createdAt.getTime() < Date.now() - 60000) {
        return context.redirect("begin?e=Ticket expired.", 302);
    }

    // Delete ticket and any other expired tickets
    await db
        .delete(Ticket)
        .where(or(
            eq(Ticket.id, ticket.id),
            lt(Ticket.createdAt, new Date(Date.now() - 60000)),
        ));

    context.locals.session.data.memberDiscord = memberDiscord;

    return context.redirect("complete", 302);
};
