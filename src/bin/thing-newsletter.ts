import { eq, isNotNull, sql } from "drizzle-orm";
import db, { wordId } from "../database/db";
import { Subscriber, SubscriberPreference } from "../database/schema";
import { sendEmail } from "../components/Newsletter/smtp";

const HOURS = 24;
const SITE_URL = import.meta.env.PUBLIC_SITE_URL ?? "https://nonacademic.net";

type thingType = "sound" | "motion" | "sight" | "word";

function formatDbDateTime(date: Date) {
    return date.toISOString().slice(0, 19).replace("T", " ");
}

function parseDbDate(value: any) {
    if (value instanceof Date)
        return value;

    return new Date(`${String(value).replace(" ", "T")}Z`);
}

function slugify(slugType: string, id: number, title: string): string {
    return `/${slugType}/${id}-${title.toLowerCase().replaceAll(/[\s_-]+/g, "-")}`;
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function newThings(sinceSQL: string) {
    const types = ["Sound", "Motion", "Sight", "Word"] as const;
    const newThings: Record<thingType, any[]> = {} as any;

    for (const type of types) {
        const key = type.toLowerCase() as thingType;
        // Thank god for sql.identifier
        const rows = await db.all(
            sql`SELECT t.id, t.title, t.date
                FROM ${sql.identifier(type)} t
                INNER JOIN "Member" m ON t.memberDiscord = m.discord
                WHERE t.deleted = 0 AND m.deleted = 0 AND t.date >= ${sinceSQL}
                ORDER BY t.date ASC`
        );
        newThings[key] = (rows as any[]).map(({ id, title, date }) => {
            const thingDate = parseDbDate(date);
            const thingID = Number(id);
            let path;

            if (type === "Word")
                path = `/words/${wordId({date: thingDate})}`;
            else
                path = slugify(`${type.toLowerCase()}`, thingID, title ?? "");

            return {
                title: title ?? "Untitled",
                date,
                path,
            };
        });
    }

    return newThings;
}

async function getSubscribers() {
    const subsList = await db
        .select({
            id: Subscriber.id,
            email: Subscriber.email,
            preference: SubscriberPreference.thingType,
            unsubscribeToken: Subscriber.unsubscribeToken,
        })
        .from(Subscriber)
        .leftJoin(SubscriberPreference, eq(Subscriber.id, SubscriberPreference.subscriberId))
        .where(isNotNull(Subscriber.verifiedAt))
        .orderBy(Subscriber.id);

    const subscribers: Record<string, { preferences: thingType[], unsubscribeToken: string }> = {};
    for (const { email, preference, unsubscribeToken } of subsList) {
        if (!preference)
            continue;

        if (!subscribers[email])
            subscribers[email] = { preferences: [], unsubscribeToken };
        subscribers[email].preferences.push(preference);
    }

    return subscribers;
}

async function sendNewsletter() {
    const since = new Date(Date.now() - HOURS * 60 * 60 * 1000);
    const sinceSQL = formatDbDateTime(since);
    const newThingsByType = await newThings(sinceSQL);
    const hasUpdates = Object.values(newThingsByType).some((things) => things.length > 0);

    if (!hasUpdates) {
        console.log("[newsletter] No new things to include in the newsletter. Skipping send.");
        return;
    }

    const subscribers = await getSubscribers();
    if (Object.keys(subscribers).length === 0) {
        console.log("[newsletter] No subscribers to send to. Skipping send.");
        return;
    }

    const newsletterDate = new Date().toISOString().slice(0, 10);
    const subject = `Updates for ${newsletterDate}`;
    const intro = `New stuff in the last ${HOURS === 24 ? "day" : `${HOURS} hours`}.`

    console.log(`[newsletter] Sending newsletter with subject "${subject}" to ${Object.keys(subscribers).length} subscribers...`);
    for (const [email, { preferences, unsubscribeToken }] of Object.entries(subscribers)) {
        const unsubscribeUrl = `${SITE_URL}/email/unsubscribe?token=${unsubscribeToken}`;

        const htmlSections = [];
        const textSections = [];

        for (const pref of preferences) {
            const things = newThingsByType[pref];
            if (things.length === 0)
                continue;

            const capitalizedPref = pref.charAt(0).toUpperCase() + pref.slice(1);
            htmlSections.push(`<h2>${capitalizedPref}s</h2><ul>`);
            textSections.push(`\n\n${capitalizedPref}s:\n`);

            for (const { title, path } of things) {
                htmlSections.push(`<li><a href="${escapeHtml(new URL(path, SITE_URL).toString())}">${escapeHtml(title)}</a></li>`);
                textSections.push(`- ${title}: ${SITE_URL}/${path}`);
            }

            htmlSections.push(`</ul>`);
        }

        if (htmlSections.length === 0) {
            console.log(`[newsletter] No new things for subscriber ${email}'s preferences. Skipping email.`);
            continue;
        }

        const html = `<!doctype html><html><body style="font-family: sans-serif; line-height: 1.6; color: #111;">
            <h1>${escapeHtml(subject)}</h1>
            <p>${escapeHtml(intro)}</p>
            ${htmlSections.join("")}
            <p style="margin-top: 2em; font-size: 0.85em;">You are receiving this because you opted in on ${escapeHtml(SITE_URL)}. <a href="${escapeHtml(unsubscribeUrl.toString())}">Unsubscribe</a></p>
        </body></html>`;

        const text = [
            subject,
            intro,
            "",
            textSections.join("\n\n"),
            "",
            `Unsubscribe: ${unsubscribeUrl.toString()}`,
        ].join("\n");

        try {
            await sendEmail(subject, html, text, email);
            console.log(`[newsletter] Sent newsletter to ${email}`);
        } catch (err) {
            console.error(`[newsletter] Failed to send newsletter to ${email}:`, err);
        }
    }
}

try {
    await sendNewsletter();
    console.log("[newsletter] Done.");
} catch (err) {
    console.error("[newsletter] Failed to send newsletter:", err);
    process.exit(1);
}