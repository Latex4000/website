CREATE TABLE "Motion" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"title" text NOT NULL,
	"youtubeUrl" text NOT NULL,
	"memberDiscord" text NOT NULL,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"tags" text NOT NULL DEFAULT '[]',
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);