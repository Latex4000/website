CREATE TABLE "Action" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "memberDiscord" text NOT NULL,
	"title" text NOT NULL,
    "description" text NOT NULL,
	"url" text NOT NULL UNIQUE,
    "siteUrl" text NOT NULL UNIQUE,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

CREATE TABLE "ActionItem" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "actionID" INTEGER NOT NULL,
    "title" text,
    "url" text NOT NULL,
    "description" text NOT NULL,
    "date" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("actionID") REFERENCES "Action" ("id")
);