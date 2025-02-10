import { access, constants } from "node:fs/promises";
import { createClient } from "@libsql/client";
import Parser from "rss-parser";

const rssParser = new Parser();

function printUsageAndExit() {
    console.error(
        `Usage: \x1b[4m${process.argv[1]}\x1b[m <database> [<start_migration>]`,
    );
    process.exit(1);
}

if (process.argv.length < 2 || process.argv.length > 3) {
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

const sqliteClient = createClient({ url: `file:${database}` });

const actions = await sqliteClient.execute("SELECT id, url FROM Action");

console.error(
    `Fetching rss feeds for ${actions.rows.length} actions\nStart time: ${new Date().toISOString()}`,
);

// each Action is an rss feed, get the new items since last time, and add them into ActionItem
let newItems = 0;
let actionsDone = 0;
const start = Date.now();
for (const action of actions.rows) {
    const feed = await rssParser.parseURL(action.url);

    for (const item of feed.items) {
        await sqliteClient.execute(
            `
            INSERT INTO "ActionItem" ("actionID", "title", "description", "url", "date")
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING
        `,
            [
                action.id,
                item.title || "",
                item.description ||
                    item.summary ||
                    item.contentSnippet ||
                    item.title ||
                    "",
                item.link,
                new Date(
                    item.pubDate || item.isoDate || Date.now(),
                ).toISOString(),
            ],
        );
        newItems++;
    }
    actionsDone++;
    console.error(`Action ${actionsDone}/${actions.rows.length} done`);
}
console.error(`Added ${newItems} new items in ${Date.now() - start}ms`);
