CREATE TABLE IF NOT EXISTS "OmarcordMessage" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "OmarcordMessage_createdAt_idx" ON "OmarcordMessage" ("createdAt");
