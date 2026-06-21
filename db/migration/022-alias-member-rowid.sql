-- Explicitly declares the rowid as a named column, which makes sqlite gaurantee stable values.
-- This is what most other tables already do but Member was originally using "discord" as a fake primary key
-- New "id" will not necessarily be the same as old "rowid", but they will be in the same order

CREATE TABLE "_tmp_Member" (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT,
	"discord" text NOT NULL UNIQUE,
	"alias" text NOT NULL UNIQUE,
	"site" text UNIQUE,
	"addedRingToSite" integer NOT NULL,
	"color" text NOT NULL,
	"deleted" integer NOT NULL DEFAULT 0
);

INSERT INTO "_tmp_Member" ("discord", "alias", "site", "addedRingToSite", "color", "deleted")
	SELECT *
	FROM "Member"
	ORDER BY "rowid" ASC;

DROP TABLE "Member";
ALTER TABLE "_tmp_Member" RENAME TO "Member";
