CREATE TABLE "_tmp_Action" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "memberDiscord" text NOT NULL,
	"title" text NOT NULL,
    "description" text NOT NULL,
	"url" text NOT NULL UNIQUE,
    "siteUrl" text NOT NULL UNIQUE,
    "isRSS" INTEGER NOT NULL,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

CREATE TABLE "_tmp_ActionItem" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "actionID" INTEGER NOT NULL,
    "title" text,
    "url" text NOT NULL UNIQUE,
    "description" text NOT NULL,
    "date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("actionID") REFERENCES "_tmp_Action" ("id")
);

INSERT INTO "_tmp_Action" ("id", "memberDiscord", "title", "description", "url", "siteUrl", "isRSS")
    SELECT "id", "memberDiscord", "title", "description", "url", "siteUrl", 1
    FROM "Action";

INSERT INTO "_tmp_ActionItem"
    SELECT *
    FROM "ActionItem";

DROP TABLE "ActionItem";
ALTER TABLE "_tmp_ActionItem" RENAME TO "ActionItem";

DROP TABLE "Action";
ALTER TABLE "_tmp_Action" RENAME TO "Action";