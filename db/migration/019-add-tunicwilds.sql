CREATE TABLE "Tunicwild" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "memberDiscord" text,
    "composer" text NOT NULL,
    "title" text NOT NULL,
    "game" text NOT NULL,
    "releaseDate" text NOT NULL,
    "extraHint" text NOT NULL,
    "deleted" integer NOT NULL DEFAULT 0,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);
