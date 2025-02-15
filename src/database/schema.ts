import { relations, sql } from "drizzle-orm";
import { sqliteTable, integer, text, customType } from "drizzle-orm/sqlite-core";

const date = customType<{ data: Date; driverData: string }>({
    dataType: () => "text",
    fromDriver: (value) => new Date(value),
    toDriver: (value) => value.toISOString().replace("T", " ").slice(0, 19),
});

export const Action = sqliteTable("Action", {
    id: integer().primaryKey({ autoIncrement: true }),
    memberDiscord: text().notNull().references(() => Member.discord),
    title: text().notNull(),
    description: text().notNull(),
    url: text().notNull(),
    siteUrl: text().notNull(),
    isRss: integer({ mode: "boolean" }).notNull(),
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
    actionId: integer().notNull().references(() => Action.id),
    title: text(),
    url: text().notNull(),
    description: text().notNull(),
    date: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const ActionItemRelations = relations(ActionItem, ({ one }) => ({
    action: one(Action, {
        fields: [ActionItem.actionId],
        references: [Action.id],
    }),
}));

export const Member = sqliteTable("Member", {
    discord: text().primaryKey(),
    alias: text().notNull(),
    site: text(),
    addedRingToSite: integer({ mode: "boolean" }).notNull(),
    color: text().notNull(),
});

export const MemberRelations = relations(Member, ({ many }) => ({
    words: many(Word),
    motions: many(Motion),
    sounds: many(Sound),
    actions: many(Action),
}));

export const Motion = sqliteTable("Motion", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    youtubeUrl: text().notNull(),
    memberDiscord: text().notNull().references(() => Member.discord),
    date: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
});

export const MotionRelations = relations(Motion, ({ one }) => ({
    member: one(Member, {
        fields: [Motion.memberDiscord],
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
});

export const SoundRelations = relations(Sound, ({ one }) => ({
    member: one(Member, {
        fields: [Sound.memberDiscord],
        references: [Member.discord],
    }),
}));

export const Word = sqliteTable("Word", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    memberDiscord: text().notNull().references(() => Member.discord),
    date: date().default(sql`CURRENT_TIMESTAMP`).notNull(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
});

export const WordRelations = relations(Word, ({ one }) => ({
    member: one(Member, {
        fields: [Word.memberDiscord],
        references: [Member.discord],
    }),
}));
