CREATE TABLE "_tmp_Sound" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"memberDiscord" text NOT NULL,
	"youtubeUrl" text NOT NULL,
	"soundcloudUrl" text NOT NULL,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"tags" text NOT NULL DEFAULT '[]',
	"trackType" text NOT NULL,
	"coverType" text NOT NULL,
    "deleted" integer NOT NULL DEFAULT 0,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Sound" ("id", "title", "memberDiscord", "youtubeUrl", "soundcloudUrl", "date", "tags", "trackType", "coverType")
	SELECT "id", "title", "memberDiscord", "youtubeUrl", "soundcloudUrl", "date", "tags", "trackType", "coverType"
	FROM "Sound";

DROP TABLE "Sound";
ALTER TABLE "_tmp_Sound" RENAME TO "Sound";

CREATE TABLE "_tmp_Word" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "title" text NOT NULL,
    "memberDiscord" text NOT NULL,
    "date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Word" ("id", "title", "memberDiscord", "date", "tags")
    SELECT "id", "title", "memberDiscord", "date", "tags"
    FROM "Word";

DROP TABLE "Word";
ALTER TABLE "_tmp_Word" RENAME TO "Word";

CREATE TABLE "_tmp_Motion" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"youtubeUrl" text NOT NULL,
	"memberDiscord" text NOT NULL,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Motion" ("id", "title", "youtubeUrl", "memberDiscord", "date", "tags")
    SELECT "id", "title", "youtubeUrl", "memberDiscord", "date", "tags"
    FROM "Motion";

DROP TABLE "Motion";
ALTER TABLE "_tmp_Motion" RENAME TO "Motion";