CREATE TABLE "PageView" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "fingerprint" text NOT NULL,
    "path" text NOT NULL,
    "method" text NOT NULL,
    "status" integer NOT NULL,
    "referer" text,
    "userAgent" text,
    "createdAt" text NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "PageView_createdAt_idx" ON "PageView" ("createdAt");
CREATE INDEX "PageView_path_createdAt_idx" ON "PageView" ("path", "createdAt");
CREATE INDEX "PageView_fingerprint_createdAt_idx" ON "PageView" ("fingerprint", "createdAt");
