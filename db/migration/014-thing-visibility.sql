CREATE TABLE "_tmp_Sight" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "memberDiscord" text NOT NULL,
    "date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
    "showColour" integer NOT NULL DEFAULT 1,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Sight"
    SELECT "id", "title", "description", "memberDiscord", "date", "tags", "deleted", 1
    FROM "Sight";

DROP TABLE "Sight";
ALTER TABLE "_tmp_Sight" RENAME TO "Sight";

CREATE TABLE "_tmp_Word" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "title" text NOT NULL,
    "memberDiscord" text NOT NULL,
    "date" text NOT NULL DEFAULT CURRENT_TIMESTAMP UNIQUE,
    "tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
    "showColour" integer NOT NULL DEFAULT 1,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Word"
    SELECT "id", "title", "memberDiscord", "date", "tags", "deleted", 1
    FROM "Word";

DROP TABLE "Word";
ALTER TABLE "_tmp_Word" RENAME TO "Word";

CREATE TABLE "_tmp_Sound" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"memberDiscord" text NOT NULL,
	"youtubeUrl" text,
	"soundcloudUrl" text,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"tags" text NOT NULL DEFAULT '[]',
	"trackType" text NOT NULL,
	"coverType" text NOT NULL,
	"deleted" integer NOT NULL DEFAULT 0,
    "showColour" integer NOT NULL DEFAULT 1,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Sound"
	SELECT "id", "title", "memberDiscord", "youtubeUrl", "soundcloudUrl", "date", "tags", "trackType", "coverType", "deleted", 1
	FROM "Sound";

DROP TABLE "Sound";
ALTER TABLE "_tmp_Sound" RENAME TO "Sound";

CREATE TABLE "_tmp_Motion" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"youtubeUrl" text NOT NULL,
	"memberDiscord" text NOT NULL,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
    "showColour" integer NOT NULL DEFAULT 1,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Motion"
    SELECT "id", "title", "youtubeUrl", "memberDiscord", "date", "tags", "deleted", 1
    FROM "Motion";

DROP TABLE "Motion";
ALTER TABLE "_tmp_Motion" RENAME TO "Motion";