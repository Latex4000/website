BEGIN TRANSACTION;

DROP TABLE IF EXISTS "Member";
CREATE TABLE "Member" (
	"discord" text,
	"alias" text NOT NULL UNIQUE,
	"site" text UNIQUE,
	"addedRingToSite" integer NOT NULL,
	"color" text NOT NULL,
	PRIMARY KEY("discord")
);

DROP TABLE IF EXISTS "Sound";
CREATE TABLE "Sound" (
	"_id" INTEGER,
	"title" text NOT NULL,
	"youtubeUrl" text NOT NULL,
	"soundcloudUrl" text NOT NULL,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY("_id")
);

DROP TABLE IF EXISTS "Word";
CREATE TABLE "Word" (
	"_id" INTEGER,
	"date" text NOT NULL DEFAULT CURRENT_TIMESTAMP UNIQUE,
	"memberDiscord" text NOT NULL,
	"tags" text NOT NULL DEFAULT '[]',
	"title" text NOT NULL,
	PRIMARY KEY("_id"),
	FOREIGN KEY("memberDiscord") REFERENCES "Member"("discord")
);

DROP TABLE IF EXISTS "_astro_db_snapshot";
CREATE TABLE "_astro_db_snapshot" (
	"id" INTEGER,
	"version" TEXT,
	"snapshot" BLOB,
	PRIMARY KEY("id" AUTOINCREMENT)
);

COMMIT;
