CREATE TABLE "Subscriber" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "email" text NOT NULL UNIQUE,
    "verifyToken" text NOT NULL UNIQUE,
    "unsubscribeToken" text NOT NULL UNIQUE,
    "createdAt" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" text,
    "unsubscribedAt" text
);

CREATE TABLE "SubscriberPreference" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "subscriberId" integer NOT NULL,
    "thingType" text NOT NULL,
    "createdAt" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "SubscriberPreference_subscriber_thing_idx" ON "SubscriberPreference" ("subscriberId", "thingType");
CREATE INDEX "SubscriberPreference_subscriber_idx" ON "SubscriberPreference" ("subscriberId");
