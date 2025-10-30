import { SQL, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

export function lower(column: SQLiteColumn | string): SQL {
    return sql`lower(${column})`;
}

export function upper(column: SQLiteColumn | string): SQL {
    return sql`upper(${column})`;
}

export function like(column: SQLiteColumn | string, value: string): SQL {
    return sql`${column} LIKE ${value}`;
}