CREATE TABLE "_tmp_Sound" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"youtubeUrl" text NOT NULL,
	"soundcloudUrl" text,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"tags" text NOT NULL DEFAULT '[]',
	"trackType" text NOT NULL,
	"coverType" text NOT NULL
);

INSERT INTO "_tmp_Sound" ("id", "title", "youtubeUrl", "soundcloudUrl", "date", "trackType", "coverType")
	SELECT "id", "title", "youtubeUrl", "soundcloudUrl", "date", 'mp3', 'jpg'
	FROM "Sound";

DROP TABLE "Sound";
ALTER TABLE "_tmp_Sound" RENAME TO "Sound";
