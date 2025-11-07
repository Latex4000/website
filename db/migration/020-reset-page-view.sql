DROP TABLE IF EXISTS "PageView";

CREATE TABLE "PageView" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "path" text NOT NULL,
    "status" integer NOT NULL,
    "referrer" text,
    "createdAt" text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PageView_createdAt_idx" ON "PageView" ("createdAt");
CREATE INDEX "PageView_path_createdAt_idx" ON "PageView" ("path", "createdAt");
