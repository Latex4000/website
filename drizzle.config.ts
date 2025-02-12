import { defineConfig } from "drizzle-kit";

// TODO: Also read this from .env using vite
//       And probably import.meta.env but idk how it works yet
if (!process.env.DATABASE_URL) {
    throw new Error("Missing DATABASE_URL");
}

export default defineConfig({
    out: "drizzle",
    schema: "src/database/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
