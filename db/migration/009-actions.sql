CREATE TABLE "Action" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "memberDiscord" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"url" text NOT NULL,
	FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);

CREATE TABLE "ActionItem" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "actionID" INTEGER NOT NULL,
    "title" text NOT NULL,
    "link" text NOT NULL,
    "date" text NOT NULL,
    FOREIGN KEY ("actionID") REFERENCES "Action" ("id")
);