import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import db from "../database/db";
import { Member } from "../database/schema";

export const prerender = false;

export const GET: APIRoute = async (context) => {
    const alias = context.request.headers.get("X-Latex-Alias");

    if (!alias) {
        return new Response(null, { status: 400 });
    }

    const member = await db
        .select({ site: Member.site })
        .from(Member)
        .where(eq(Member.alias, alias))
        .get();

    if (member?.site == null) {
        return new Response(null, { status: 404 });
    }

    return context.redirect(member.site, 307);
};
