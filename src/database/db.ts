import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const db = drizzle(import.meta.env.DATABASE_URL, { schema });
export default db;
