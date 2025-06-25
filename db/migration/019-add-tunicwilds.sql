CREATE TABLE "Tunicwild" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "memberDiscord" text NOT NULL,
    "composer" text NOT NULL,
    "title" text NOT NULL,
    "game" text NOT NULL,
    "releaseDate" text NOT NULL,
    "officialLink" text NOT NULL,
    "extraHint" text NOT NULL,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);
