import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
}

const db = drizzle(process.env.DATABASE_URL, { schema });
export default db;
