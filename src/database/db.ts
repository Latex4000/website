import type { InferSelectModel } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { LibsqlError } from "@libsql/client";

let db: LibSQLDatabase<typeof schema> | undefined;
if (!process.env.PRERENDERING) {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL not set");
    }

    db = drizzle(process.env.DATABASE_URL, { schema });
}
export default db!;

export function wordId(word: Pick<InferSelectModel<typeof schema.Word>, "date">): string {
    return Math.floor(word.date.getTime() / 1000).toString(10);
}

/**
 * Perform a database operation, retrying with increasing delay if it fails with `SQLITE_BUSY`.
 */
export async function retryIfDbBusy<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
    let lastError: unknown = new Error();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (!(error instanceof LibsqlError) || error.code !== "SQLITE_BUSY") {
                break;
            }

            const delayMs = 100 * 2 ** attempt; // 100ms, 200ms, 400ms, ...
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }

    throw lastError;
}
