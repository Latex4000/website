import type { InferSelectModel } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { LibsqlError } from "@libsql/client";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
}

const db = drizzle(process.env.DATABASE_URL, { schema });
export default db;

export function wordId(word: Pick<InferSelectModel<typeof schema.Word>, "date">): string {
    return Math.floor(word.date.getTime() / 1000).toString(10);
}

export async function dbOperation<T>(operation: () => Promise<T>, maxRetries = 5) {
    let retries = 0;
    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (
                error instanceof LibsqlError &&
                error.code === "SQLITE_BUSY" &&
                retries < maxRetries
            ) {
                retries++;
                // 100ms, then 200ms, then 400ms, then 800ms, then 1600ms
                const delay = 100 * 2 ** (retries - 1);
                await new Promise((resolve) => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}