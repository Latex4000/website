CREATE TABLE "Ticket" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "memberDiscord" text NOT NULL,
    "createdAt" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash" text NOT NULL,
    FOREIGN KEY ("memberDiscord") REFERENCES "Member" ("discord")
);
CREATE UNIQUE INDEX "Ticket_memberDiscord_hash" ON "Ticket" ("memberDiscord", "hash");

CREATE TABLE "Session" (
    "id" text PRIMARY KEY,
    "expiresAt" text NOT NULL,
    "data" text NOT NULL DEFAULT '{}'
);
