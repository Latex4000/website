import { access, constants } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient, LibsqlError } from "@libsql/client";
import Parser from "rss-parser";

function printUsageAndExit() {
    console.error(`Usage: \x1b[4m${process.argv[1]}\x1b[m <database>`);
    process.exit(1);
}

if (process.argv.length !== 3) {
    printUsageAndExit();
}

const database = process.argv[2];

if (
    !(await access(database, constants.R_OK | constants.W_OK)
        .then(() => true)
        .catch(() => false))
) {
    console.error(`<database> must be a writable file\n ${database}`);
    printUsageAndExit();
}

const rssParser = new Parser({ timeout: 5000 });
const sqliteClient = createClient({ url: `file:${database}` });

const actions = await sqliteClient.execute(
    "SELECT id, url FROM Action WHERE isRSS = 1",
);

console.error(
    `Fetching rss feeds for ${actions.rows.length} actions\nStart time: ${new Date().toISOString()}`,
);

// each Action is an rss feed, get the new items since last time, and add them into ActionItem
let newItems = 0;
let actionsDone = 0;
const start = Date.now();
for (const action of actions.rows) {
    try {
        const feed = await rssParser.parseURL(action.url);

        const transaction = await sqliteClient.transaction("write");
        try {
            for (const item of feed.items) {
                try {
                    await transaction.execute(
                        `
                            INSERT INTO "ActionItem" ("actionID", "title", "description", "url", "date")
                            VALUES (?, ?, ?, ?, ?)
                        `,
                        [
                            action.id,
                            item.title || "",
                            item.description ||
                                item.content ||
                                item.summary ||
                                item.contentSnippet ||
                                item.title ||
                                "",
                            item.link,
                            new Date(item.pubDate || item.isoDate || Date.now())
                                .toISOString()
                                .slice(0, 19)
                                .replace("T", " "),
                        ],
                    );
                    newItems++;
                } catch (error) {
                    // Skip inserting duplicate items
                    if (
                        !(error instanceof LibsqlError) ||
                        error.code !== "SQLITE_CONSTRAINT_UNIQUE"
                    ) {
                        throw error;
                    }
                }
            }
            await transaction.commit();
        } catch (e) {
            await transaction.rollback();
            throw e;
        }

        actionsDone++;
        console.error(`Action ${actionsDone}/${actions.rows.length} done`);
    } catch (e) {
        actionsDone++;
        console.error(
            `Action ${actionsDone}/${actions.rows.length} failed: ${e}`,
        );
    }
}
console.error(`Added ${newItems} new items in ${Date.now() - start}ms`);

const HOURS = 24;
const SITE_URL = "https://nonacademic.net";
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME ?? "LaTeX 4000";

const THING_CONFIG = {
    sound: { label: "Sounds", pathSegment: "sounds" },
    motion: { label: "Motions", pathSegment: "motions" },
    sight: { label: "Sights", pathSegment: "sights" },
    word: { label: "Words", pathSegment: "words" },
};

function formatDateTime(date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function parseDbDate(value) {
    if (value instanceof Date) {
        return value;
    }

    return new Date(`${String(value).replace(" ", "T")}Z`);
}

function slugify(title) {
    const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s_-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return slug.length ? slug : "thing";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function sendBrevoEmail(to, subject, html, text) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
            sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API error: ${response.status} ${errorText}`);
    }
}

async function collectNewThings(sinceSql) {
    const grouped = {
        sound: [],
        motion: [],
        sight: [],
        word: [],
    };

    const queries = {
        sound: {
            sql: `
                SELECT s.id, s.title, s.date
                FROM "Sound" s
                INNER JOIN "Member" m ON s.memberDiscord = m.discord
                WHERE s.deleted = 0 AND m.deleted = 0 AND s.date >= ?
                ORDER BY s.date ASC
            `,
        },
        motion: {
            sql: `
                SELECT mtn.id, mtn.title, mtn.date
                FROM "Motion" mtn
                INNER JOIN "Member" mem ON mtn.memberDiscord = mem.discord
                WHERE mtn.deleted = 0 AND mem.deleted = 0 AND mtn.date >= ?
                ORDER BY mtn.date ASC
            `,
        },
        sight: {
            sql: `
                SELECT sgt.id, sgt.title, sgt.date
                FROM "Sight" sgt
                INNER JOIN "Member" mem ON sgt.memberDiscord = mem.discord
                WHERE sgt.deleted = 0 AND mem.deleted = 0 AND sgt.date >= ?
                ORDER BY sgt.date ASC
            `,
        },
        word: {
            sql: `
                SELECT w.id, w.title, w.date
                FROM "Word" w
                INNER JOIN "Member" mem ON w.memberDiscord = mem.discord
                WHERE w.deleted = 0 AND mem.deleted = 0 AND w.date >= ?
                ORDER BY w.date ASC
            `,
        },
    };

    for (const [type, query] of Object.entries(queries)) {
        const rows = await sqliteClient.execute({
            sql: query.sql,
            args: [sinceSql],
        });

        grouped[type] = rows.rows.map((row) => {
            const date = parseDbDate(row.date);
            const basePath = THING_CONFIG[type].pathSegment;
            let path;
            const id = Number(row.id);

            if (type === "word") {
                path = `/${basePath}/${Math.floor(date.getTime() / 1000).toString(10)}`;
            } else {
                const slug = slugify(row.title ?? "");
                path = `/${basePath}/${id}-${slug}`;
            }

            return {
                title: row.title ?? "Untitled",
                date,
                urlPath: path,
            };
        });
    }

    return grouped;
}

async function loadSubscribers() {
    const rows = await sqliteClient.execute({
        sql: `
            SELECT s.id, s.email, s.verifyToken, s.unsubscribeToken, s.verifiedAt, s.unsubscribedAt, pref.thingType
            FROM "Subscriber" s
            LEFT JOIN "SubscriberPreference" pref ON pref.subscriberId = s.id
            ORDER BY s.id
        `,
    });

    const subscribers = new Map();

    for (const row of rows.rows) {
        const id = Number(row.id);
        if (!subscribers.has(id)) {
            subscribers.set(id, {
                id,
                email: row.email,
                verifyToken: row.verifyToken,
                unsubscribeToken: row.unsubscribeToken,
                verifiedAt: row.verifiedAt,
                unsubscribedAt: row.unsubscribedAt,
                preferences: new Set(),
            });
        }

        if (row.thingType) {
            subscribers.get(id).preferences.add(String(row.thingType));
        }
    }

    return Array.from(subscribers.values()).map((subscriber) => ({
        ...subscriber,
        preferences: Array.from(subscriber.preferences),
    }));
}

function buildDigestEmail({
    digestDate,
    categories,
    groupedItems,
    unsubscribeToken,
}) {
    const unsubscribeUrl = new URL("/email/unsubscribe", SITE_URL);
    unsubscribeUrl.searchParams.set("token", unsubscribeToken);

    const intro = `New stuff in the last ${HOURS === 24 ? "day" : `${HOURS} hours`}.`;
    const htmlSections = [];
    const textSections = [];
    const payloadData = [];

    for (const category of categories) {
        const items = groupedItems[category] ?? [];
        if (!items.length) {
            continue;
        }

        const label = THING_CONFIG[category].label;
        htmlSections.push(
            `<h3>${escapeHtml(label)}</h3><ul>${items
                .map(
                    (item) =>
                        `<li><a href="${escapeHtml(new URL(item.urlPath, SITE_URL).toString())}">${escapeHtml(item.title)}</a></li>`,
                )
                .join("")}</ul>`,
        );

        textSections.push(
            [
                label,
                ...items.map((item) => {
                    const link = new URL(item.urlPath, SITE_URL).toString();
                    return `${item.title}\n${link}`;
                }),
            ].join("\n"),
        );

        payloadData.push({
            category,
            items: items.map((item) => ({
                title: item.title,
                urlPath: item.urlPath,
            })),
        });
    }

    if (!htmlSections.length) {
        return null;
    }

    const subject = `LaTeX 4000 updates for ${digestDate}`;
    const html = `<!doctype html><html><body style="font-family: sans-serif; line-height: 1.6; color: #111;">
        <h1>${escapeHtml(subject)}</h1>
        <p>${escapeHtml(intro)}</p>
        ${htmlSections.join("")}
        <p style="margin-top: 2em; font-size: 0.85em;">You are receiving this because you opted in on ${escapeHtml(SITE_URL)}. <a href="${escapeHtml(unsubscribeUrl.toString())}">Unsubscribe</a>.</p>
    </body></html>`;

    const text = [
        subject,
        intro,
        "",
        textSections.join("\n\n"),
        "",
        `Unsubscribe: ${unsubscribeUrl.toString()}`,
    ].join("\n");

    return { subject, html, text, payloadData };
}

async function sendNewsletterDigest() {
    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
        console.error(
            "[newsletter] Skipping digest: Brevo configuration missing",
        );
        return;
    }

    const sinceSql = formatDateTime(
        new Date(Date.now() - HOURS * 60 * 60 * 1000),
    );
    const grouped = await collectNewThings(sinceSql);
    const hasUpdates = Object.values(grouped).some((items) => items.length > 0);

    if (!hasUpdates) {
        console.error(
            "[newsletter] No new content within window; digest skipped",
        );
        return;
    }

    const subscribers = await loadSubscribers();
    if (!subscribers.length) {
        console.error("[newsletter] No subscribers to notify");
        return;
    }

    const digestDate = new Date().toISOString().slice(0, 10);

    for (const subscriber of subscribers) {
        if (!subscriber.verifiedAt || subscriber.unsubscribedAt) {
            continue;
        }

        const categories = subscriber.preferences.filter(
            (category) => category in grouped,
        );
        if (!categories.length) {
            continue;
        }

        const content = buildDigestEmail({
            digestDate,
            categories,
            groupedItems: grouped,
            unsubscribeToken: subscriber.unsubscribeToken,
        });

        if (!content) {
            continue;
        }

        const payloadHash = createHash("sha256")
            .update(JSON.stringify(content.payloadData))
            .digest("hex");

        const alreadySent = await sqliteClient.execute({
            sql: `
                SELECT 1 FROM "DeliveryLog"
                WHERE subscriberId = ? AND digestDate = ? AND payloadHash = ?
                LIMIT 1
            `,
            args: [subscriber.id, digestDate, payloadHash],
        });

        if (alreadySent.rows.length) {
            continue;
        }

        try {
            await sendBrevoEmail(
                subscriber.email,
                content.subject,
                content.html,
                content.text,
            );
            await sqliteClient.execute({
                sql: `INSERT INTO "DeliveryLog" (subscriberId, digestDate, payloadHash) VALUES (?, ?, ?)`,
                args: [subscriber.id, digestDate, payloadHash],
            });
            console.error(`[newsletter] Sent digest to ${subscriber.email}`);
        } catch (error) {
            console.error(
                `[newsletter] Failed to send digest to ${subscriber.email}:`,
                error,
            );
        }
    }
}

try {
    await sendNewsletterDigest();
} catch (error) {
    console.error("[newsletter] Digest run failed", error);
}

sqliteClient.close();
