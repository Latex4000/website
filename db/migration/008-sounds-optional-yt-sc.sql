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
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

INSERT INTO "_tmp_Sound"
	SELECT *
	FROM "Sound";

DROP TABLE "Sound";
ALTER TABLE "_tmp_Sound" RENAME TO "Sound";
