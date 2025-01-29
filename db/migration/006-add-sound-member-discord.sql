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
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Sound" ("id", "title", "memberDiscord", "youtubeUrl", "soundcloudUrl", "date", "tags", "trackType", "coverType")
	SELECT "id", "title", (SELECT "discord" FROM "Member" LIMIT 1), "youtubeUrl", "soundcloudUrl", "date", "tags", "trackType", "coverType"
	FROM "Sound";

DROP TABLE "Sound";
ALTER TABLE "_tmp_Sound" RENAME TO "Sound";
