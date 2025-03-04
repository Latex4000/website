import type { APIRoute } from "astro";
import { and, eq } from "drizzle-orm";
import db from "../database/db";
import { Member } from "../database/schema";

export const prerender = false;

export const GET: APIRoute = async (context) => {
    const action = context.url.searchParams.get("action");
    const alias = context.url.searchParams.get("from");

    if (!alias || (action !== "prev" && action !== "next" && action !== "rand"))
        return new Response(null, { status: 400 });

    const members = await db
        .select({
            alias: Member.alias,
            site: Member.site,
        })
        .from(Member)
        .where(
            and(
                eq(Member.addedRingToSite, true),
                eq(Member.deleted, false),
            ),
        );

    members.unshift({
        alias: "LaTeX 4000",
        site: context.site?.toString() ?? "",
    });

    const fromMemberIndex = members.findIndex(
        (member) => member.alias === alias,
    );

    if (fromMemberIndex < 0)
        return new Response("Invalid alias", { status: 404 });

    let toMemberIndex: number;

    switch (action) {
        case "prev":
            toMemberIndex =
                (fromMemberIndex - 1 + members.length) % members.length;
            break;
        case "next":
            toMemberIndex = (fromMemberIndex + 1) % members.length;
            break;
        case "rand":
            toMemberIndex = Math.floor(Math.random() * (members.length - 1));
            if (toMemberIndex >= fromMemberIndex) {
                toMemberIndex++;
            }
            break;
    }

    if (!members[toMemberIndex]!.site)
        return new Response(
            "Member has no site, there is an issue with the database",
            { status: 500 },
        );

    return context.redirect(members[toMemberIndex]!.site!, 307);
};
