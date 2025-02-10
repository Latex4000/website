import { readdir, readFile, access, constants } from "node:fs/promises";
import { createClient } from "@libsql/client";

function printUsageAndExit() {
    console.error(
        `Usage: \x1b[4m${process.argv[1]}\x1b[m <database> [<start_migration>]`,
    );
    process.exit(1);
}

if (process.argv.length < 3 || process.argv.length > 4) {
    printUsageAndExit();
}

const database = process.argv[2];
const startMigrationId = Number.parseInt(process.argv[3] ?? "1", 10);

if (
    process.argv.length === 4 &&
    !(await access(database, constants.R_OK | constants.W_OK)
        .then(() => true)
        .catch(() => false))
) {
    console.error(`<database> must be a writable file\n ${database}`);
    printUsageAndExit();
}

if (Number.isNaN(startMigrationId)) {
    console.error(`<start_migration> must be a number\n ${startMigrationId}`);
    printUsageAndExit();
}

const sqliteClient = createClient({ url: `file:${database}` });

async function applyMigration(migrationId, migrationPath) {
    await sqliteClient.executeMultiple(
        "BEGIN TRANSACTION;\n" +
            "PRAGMA defer_foreign_keys = 1;\n" +
            (await readFile(migrationPath, "utf8")) +
            "COMMIT;\n",
    );

    await sqliteClient.execute(
        `
			INSERT INTO "_migrations" ("id", "applied") VALUES (${migrationId}, 1)
				ON CONFLICT ("id") DO UPDATE SET "applied" = 1
		`,
    );
}

await sqliteClient.execute(
    `
		CREATE TABLE IF NOT EXISTS "_migrations" (
			"id" INTEGER PRIMARY KEY,
			"applied" INTEGER NOT NULL DEFAULT 0
		)
	`,
);

const directory = "db/migration";
const filenames = await readdir(directory);
filenames.sort();

const appliedMigrationsResult = await sqliteClient.execute(
    'SELECT "id" FROM "_migrations" WHERE "applied" = 1',
);
const appliedMigrationIds = new Set(
    appliedMigrationsResult.rows.map((row) => row.id),
);

console.error(`Applying migrations starting from ${startMigrationId}`);

for (const migrationFilename of filenames) {
    const migrationId = Number.parseInt(migrationFilename.slice(0, 3), 10);

    if (migrationId < startMigrationId) {
        continue;
    }

    if (appliedMigrationIds.has(migrationId)) {
        console.error(`Skipping migration #${migrationId}, already applied`);
        continue;
    }

    console.error(`Applying ${migrationFilename}`);
    await applyMigration(migrationId, `${directory}/${migrationFilename}`);
}
