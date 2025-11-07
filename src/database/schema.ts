import { relations, sql } from "drizzle-orm";
import { sqliteTable, integer, text, customType, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import type { SessionData } from "../server/session";

const date = customType<{ data: Date; driverData: string }>({
    dataType: () => "text",
    fromDriver: (value) => new Date(value + "Z"),
    toDriver: (value) => value.toISOString().slice(0, 19).replace("T", " "),
});

export const Migration = sqliteTable("_migrations", {
    id: integer().primaryKey(),
    applied: integer({ mode: "boolean" }).default(false).notNull(),
});

export const Action = sqliteTable("Action", {
    id: integer().primaryKey({ autoIncrement: true }),
    memberDiscord: text().notNull().references(() => Member.discord),
    title: text().notNull(),
    description: text().notNull(),
    url: text().notNull().unique(),
    siteUrl: text().notNull().unique(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
    isRSS: integer({ mode: "boolean" }).notNull(),
});

export const ActionRelations = relations(Action, ({ one, many }) => ({
    member: one(Member, {
        fields: [Action.memberDiscord],
        references: [Member.discord],
    }),
    actionItems: many(ActionItem),
}));

export const ActionItem = sqliteTable("ActionItem", {
    id: integer().primaryKey({ autoIncrement: true }),
    actionID: integer().notNull().references(() => Action.id),
    title: text(),
    url: text().notNull().unique(),
    description: text().notNull(),
    date: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ActionItemRelations = relations(ActionItem, ({ one }) => ({
    action: one(Action, {
        fields: [ActionItem.actionID],
        references: [Action.id],
    }),
}));

export const Member = sqliteTable("Member", {
    discord: text().primaryKey(),
    alias: text().notNull().unique(),
    site: text().unique(),
    addedRingToSite: integer({ mode: "boolean" }).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
    color: text().notNull(),
});

export const MemberRelations = relations(Member, ({ many }) => ({
    actions: many(Action),
    motions: many(Motion),
    sights: many(Sight),
    sounds: many(Sound),
    tickets: many(Ticket),
    words: many(Word),
}));

export const Motion = sqliteTable("Motion", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    youtubeUrl: text().notNull(),
    memberDiscord: text().notNull().references(() => Member.discord),
    date: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
    showColour: integer({ mode: "boolean" }).default(true).notNull(),
});

export const MotionRelations = relations(Motion, ({ one }) => ({
    member: one(Member, {
        fields: [Motion.memberDiscord],
        references: [Member.discord],
    }),
}));

export const Session = sqliteTable("Session", {
    id: text().primaryKey(),
    expiresAt: date().notNull(),
    data: text({ mode: "json" }).$type<SessionData>().default({}).notNull(),
});

export const Sight = sqliteTable("Sight", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    description: text().notNull(),
    memberDiscord: text().notNull().references(() => Member.discord),
    date: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
    showColour: integer({ mode: "boolean" }).default(true).notNull(),
    pixelated: integer({ mode: "boolean" }).default(false).notNull(),
});

export const SightRelations = relations(Sight, ({ one }) => ({
    member: one(Member, {
        fields: [Sight.memberDiscord],
        references: [Member.discord],
    }),
}));

export const Sound = sqliteTable("Sound", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    memberDiscord: text().notNull().references(() => Member.discord),
    youtubeUrl: text(),
    soundcloudUrl: text(),
    date: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    trackType: text({ enum: ["mp3", "wav"] }).notNull(),
    coverType: text({ enum: ["jpg", "png"] }).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
    showColour: integer({ mode: "boolean" }).default(true).notNull(),
});

export const SoundRelations = relations(Sound, ({ one }) => ({
    member: one(Member, {
        fields: [Sound.memberDiscord],
        references: [Member.discord],
    }),
}));

export const Ticket = sqliteTable("Ticket", {
    id: integer().primaryKey({ autoIncrement: true }),
    memberDiscord: text().notNull().references(() => Member.discord),
    createdAt: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
    hash: text().notNull(),
}, (table) => [
    uniqueIndex("Ticket_memberDiscord_hash").on(table.memberDiscord, table.hash),
]);

export const TicketRelations = relations(Ticket, ({ one }) => ({
    member: one(Member, {
        fields: [Ticket.memberDiscord],
        references: [Member.discord],
    }),
}));

export const Word = sqliteTable("Word", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    memberDiscord: text().notNull().references(() => Member.discord),
    date: date().default(sql`CURRENT_TIMESTAMP`).notNull().unique(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
    showColour: integer({ mode: "boolean" }).default(true).notNull(),
});

export const WordRelations = relations(Word, ({ one }) => ({
    member: one(Member, {
        fields: [Word.memberDiscord],
        references: [Member.discord],
    }),
}));

export const PageView = sqliteTable("PageView", {
    id: integer().primaryKey({ autoIncrement: true }),
    path: text().notNull(),
    status: integer().notNull(),
    referrer: text(),
    createdAt: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
    index("PageView_createdAt_idx").on(table.createdAt),
    index("PageView_path_createdAt_idx").on(table.path, table.createdAt),
]);
