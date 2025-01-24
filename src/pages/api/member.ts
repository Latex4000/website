import type { APIRoute } from "astro";
import { db, eq, isDbError, Member } from "astro:db";
import { jsonError, jsonResponse } from "../../server/responses";
import type { MemberType } from "../../../db/config";
import { hmacInvalidResponse, validateHmac } from "../../server/hmac";

export const prerender = false;

type AlmostMemberType =
    & Omit<MemberType, 'addedRingToSite' | 'color'>
    & Partial<Pick<MemberType, 'addedRingToSite' | 'color'>>;

async function parseAndValidateRequest(request: Request): Promise<AlmostMemberType> {
    if (request.headers.get("content-type") !== "application/json")
        throw new Error("Invalid content type");

    if (!await validateHmac(request)) {
        const err = new Error("Invalid HMAC");
        (err as any).status = 401;
        throw err;
    }

    const member = await request.json();

    if (
        !member.discord ||
        !member.alias ||
        typeof member.discord !== "string" ||
        typeof member.alias !== "string" ||
        (member.addedRingToSite != null && typeof member.addedRingToSite !== "boolean") ||
        (member.color != null && typeof member.color !== "string") ||
        (member.site != null && typeof member.site !== "string")
    )
        throw new Error("Member has missing string keys/invalid keys");

    if (member.color != null) {
        const colorMatch = (member.color as string).trim().match(/^#?((?:[0-9a-f]{3}){1,2})$/i);

        if (colorMatch?.[1] == null) {
            throw new Error("Invalid color");
        }

        const sixCharColor = colorMatch[1].length === 3
            ? colorMatch[1].split("").map((char) => char.repeat(2)).join("")
            : colorMatch[1];

        member.color = `#${sixCharColor.toLowerCase()}`;
    }

    if (member.site != null)
        try {
            member.site = new URL(member.site).toString();
        } catch {
            try {
                member.site = new URL("https://" + member.site).toString();
            } catch {
                throw new Error("Invalid site");
            }
        }

    return member;
}

export const GET: APIRoute = async ({ url, request }) => {
    if (!await validateHmac(request))
        return hmacInvalidResponse();

    const id = url.searchParams.get("id");
    if (!id)
        return jsonError("Missing id");

    return jsonResponse(await db.select().from(Member).where(eq(Member.discord, id)));
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const member = await parseAndValidateRequest(request);
        member.addedRingToSite = false;
        if (member.color == null) {
            member.color = "#" + Math.floor(Math.random() * 0xffffff)
                .toString(16)
                .toLowerCase()
                .padStart(6, "0");
        }

        const memberRes = await db.insert(Member).values(member as MemberType).returning();
        return jsonResponse(memberRes);
    } catch (err: any) {
        if (typeof err.status === "number")
            return jsonError(err.message, err.status);

        if (isDbError(err))
            return jsonError(err.message);

        console.error(err);
        return jsonError("Internal server error", 500);
    }
};

export const PUT: APIRoute = async ({ request }) => {
    try {
        const member = await parseAndValidateRequest(request);

        const memberRes = await db
            .update(Member)
            .set(member)
            .where(eq(Member.discord, member.discord))
            .returning();

        return jsonResponse(memberRes);
    } catch (err: any) {
        if (typeof err.status === "number")
            return jsonError(err.message, err.status);

        if (isDbError(err))
            return jsonError(err.message);

        console.error(err);
        return jsonError("Internal server error", 500);
    }
};
