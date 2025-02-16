CREATE TABLE "_tmp_Word" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "title" text NOT NULL,
    "memberDiscord" text,
    "date" text NOT NULL DEFAULT CURRENT_TIMESTAMP UNIQUE,
    "tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Word"
    SELECT *
    FROM "Word";

DROP TABLE "Word";
ALTER TABLE "_tmp_Word" RENAME TO "Word";
