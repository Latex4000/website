import type { APIContext } from "astro";
import { eq } from "drizzle-orm";
import db from "../../database/db";
import { Member } from "../../database/schema";
import { JsonResponseError } from "../responses";

export async function requireCorpMember(context: APIContext) {
    const discord = context.locals.session.data.memberDiscord;
    if (!discord)
        throw new JsonResponseError("Not authenticated", 401);

    const member = await db
        .select()
        .from(Member)
        .where(eq(Member.discord, discord))
        .get();

    if (!member)
        throw new JsonResponseError("Member does not exist", 403);

    if (member.deleted)
        throw new JsonResponseError("Member has been deleted", 403);

    return member;
}
