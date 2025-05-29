import { access, constants } from "node:fs/promises";
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

const rssParser = new Parser();
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
                    if (!(error instanceof LibsqlError) || error.code !== "SQLITE_CONSTRAINT_UNIQUE") {
                        throw error;
                    }
                }
            }
            await transaction.commit();
        } catch (e) {
            await transaction.rollback();
            console.error(e);
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

sqliteClient.close();
process.exit(0);
