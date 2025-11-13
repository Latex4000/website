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

CREATE TABLE "DeliveryLog" (
    "id" integer PRIMARY KEY AUTOINCREMENT,
    "subscriberId" integer NOT NULL,
    "digestDate" text NOT NULL,
    "payloadHash" text NOT NULL,
    "sentAt" text NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "DeliveryLog_subscriber_digest_hash_idx" ON "DeliveryLog" ("subscriberId", "digestDate", "payloadHash");
CREATE INDEX "DeliveryLog_digestDate_idx" ON "DeliveryLog" ("digestDate");
