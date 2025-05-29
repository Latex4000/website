import { execFileSync } from "node:child_process";
import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";

export const prerender = false;

export const GET: APIRoute = () => {
    if (!process.env.LATEX_WEB_SYSTEMD_UNIT) {
        return jsonError("LATEX_WEB_SYSTEMD_UNIT not set", 500);
    }

    const journalJsons = execFileSync("journalctl", [
        "-u",
        process.env.LATEX_WEB_SYSTEMD_UNIT,
        "-S",
        "-1week",
        "-o",
        "json",
        "--output-fields",
        "__REALTIME_TIMESTAMP,MESSAGE,PRIORITY",
    ], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
    });

    return jsonResponse(
        journalJsons.trimEnd().split("\n").map((json) => {
            const item = JSON.parse(json);

            return {
                message: item.MESSAGE,
                priority: Number.parseInt(item.PRIORITY, 10),
                timestamp: item.__REALTIME_TIMESTAMP,
            };
        }),
    );
}
