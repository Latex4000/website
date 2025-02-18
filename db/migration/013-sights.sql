CREATE TABLE "Sight" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "memberDiscord" text,
    "date" text NOT NULL DEFAULT CURRENT_TIMESTAMP UNIQUE,
    "tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);