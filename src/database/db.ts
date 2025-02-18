import type { InferSelectModel } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
}

const db = drizzle(process.env.DATABASE_URL, { schema });
export default db;

export function wordId(word: Pick<InferSelectModel<typeof schema.Word>, "date">): string {
    return Math.floor(word.date.getTime() / 1000).toString(10);
}

export function sightId(sight: Pick<InferSelectModel<typeof schema.Sight>, "date">): string {
    return Math.floor(sight.date.getTime() / 1000).toString(10);
}