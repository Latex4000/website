import type { APIRoute } from "astro";
import { isNotNull } from "drizzle-orm";
import db from "../database/db";
import { Member } from "../database/schema";

export const prerender = false;

const memberAliasToHostName = (alias: string) => alias
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

export const GET: APIRoute = async (context) => {
    const alias = context.request.headers.get("X-Latex-Alias");

    if (!alias) {
        return new Response(null, { status: 400 });
    }

    const hostname = memberAliasToHostName(alias);
    const members = await db
        .select({ alias: Member.alias, site: Member.site })
        .from(Member)
        .where(isNotNull(Member.site));

    for (const member of members) {
        if (hostname === memberAliasToHostName(member.alias)) {
            return context.redirect(member.site!, 307);
        }
    }

    return new Response(null, { status: 404 });
};
