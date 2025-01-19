import type { APIRoute } from "astro";
import { db, eq, isDbError, Member } from "astro:db";
import checkHmac from "../../server/hmac";
import { jsonError, jsonResponse } from "../../server/responses";
import type { Member as MemberType } from "../../../db/config";

export const prerender = false;

async function parseAndValidateRequest(request: Request): Promise<MemberType> {
    if (request.headers.get("content-type") !== "application/json")
        throw new Error("Invalid content type");

    const member = await request.json();

    if (!checkHmac(request, JSON.stringify(member))) {
        const err = new Error("Forbidden");
        (err as any).status = 401; 
        throw err;
    }

    if (
        !member.discord ||
        !member.alias ||
        !member.site ||
        typeof member.discord !== "string" ||
        typeof member.alias !== "string" ||
        typeof member.site !== "string"
    )
        throw new Error("Member has missing string keys/invalid keys");

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

export const POST: APIRoute = async ({ request }) => {
    try {
        const member = await parseAndValidateRequest(request);
        member.addedRingToSite = false;

        const memberRes = await db.insert(Member).values([member]).returning();
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
