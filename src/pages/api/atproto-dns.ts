import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { createOrUpdateRecord, deleteRecord, getRecords } from "../../server/digitalocean";

export const prerender = false;

export const PUT: APIRoute = async ({ request }) => {
    const params = await request.json();

    if (
        typeof params.did !== "string" ||
        !params.did ||
        typeof params.subdomain !== "string" ||
        !params.subdomain
    ) {
        return jsonError("Invalid body");
    }

    const wildcardRecords = await getRecords({
        name: "*",
        type: "A",
    });

    if (wildcardRecords.length !== 1) {
        throw new Error("Couldn't get wildcard DNS record from DigitalOcean");
    }

    await createOrUpdateRecord({
        data: wildcardRecords[0]!.data,
        name: params.subdomain,
        type: "A",
    });
    await createOrUpdateRecord({
        data: `did=${params.did}`,
        name: `_atproto.${params.subdomain}`,
        type: "TXT",
    });

    return new Response(null, { status: 204 });
};

export const DELETE: APIRoute = async ({ request }) => {
    const params = await request.json();

    if (
        typeof params.subdomain !== "string" ||
        !params.subdomain
    ) {
        return jsonError("Invalid body");
    }

    const records = await getRecords({});
    const aRecord = records.find((record) => record.name === params.subdomain && record.type === "A");
    const txtRecord = records.find((record) => record.name === `_atproto.${params.subdomain}` && record.type === "TXT");

    if (aRecord != null) {
        await deleteRecord(aRecord.id);
    }

    if (txtRecord != null) {
        await deleteRecord(txtRecord.id);
    }

    return jsonResponse(txtRecord?.data.replace(/^did=/, "") ?? null);
};
