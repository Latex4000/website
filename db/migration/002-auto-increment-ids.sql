CREATE TABLE "_tmp_Sound" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"youtubeUrl" text NOT NULL,
	"soundcloudUrl" text NOT NULL,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "_tmp_Sound" ("id", "title", "youtubeUrl", "soundcloudUrl", "date")
	SELECT "_id", "title", "youtubeUrl", "soundcloudUrl", "date"
	FROM "Sound";

DROP TABLE "Sound";
ALTER TABLE "_tmp_Sound" RENAME TO "Sound";

CREATE TABLE "_tmp_Word" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP UNIQUE,
	"memberDiscord" text NOT NULL,
	"tags" text NOT NULL DEFAULT '[]',
	"title" text NOT NULL,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Word" ("id", "date", "memberDiscord", "tags", "title")
	SELECT "_id", "date", "memberDiscord", "tags", "title"
	FROM "Word";

DROP TABLE "Word";
ALTER TABLE "_tmp_Word" RENAME TO "Word";
