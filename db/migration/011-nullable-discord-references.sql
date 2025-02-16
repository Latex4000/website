CREATE TABLE "_tmp_Sound" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"memberDiscord" text NULL,
	"youtubeUrl" text,
	"soundcloudUrl" text,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"tags" text NOT NULL DEFAULT '[]',
	"trackType" text NOT NULL,
	"coverType" text NOT NULL,
	"deleted" integer NOT NULL DEFAULT 0,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Sound"
	SELECT *
	FROM "Sound";

DROP TABLE "Sound";
ALTER TABLE "_tmp_Sound" RENAME TO "Sound";

CREATE TABLE "_tmp_Word" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "title" text NOT NULL,
    "memberDiscord" text NULL,
    "date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Word"
    SELECT *
    FROM "Word";

DROP TABLE "Word";
ALTER TABLE "_tmp_Word" RENAME TO "Word";

CREATE TABLE "_tmp_Motion" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"youtubeUrl" text NOT NULL,
	"memberDiscord" text NULL,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"tags" text NOT NULL DEFAULT '[]',
    "deleted" integer NOT NULL DEFAULT 0,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Motion"
    SELECT *
    FROM "Motion";

DROP TABLE "Motion";
ALTER TABLE "_tmp_Motion" RENAME TO "Motion";