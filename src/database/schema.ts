import { relations, sql } from "drizzle-orm";
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const migrations = sqliteTable("_migrations", {
    id: integer().primaryKey(),
    applied: integer({ mode: "boolean" }).default(false).notNull(),
});

export const action = sqliteTable("Action", {
    id: integer().primaryKey({ autoIncrement: true }),
    memberDiscord: text().notNull().references(() => member.discord),
    title: text().notNull(),
    description: text().notNull(),
    url: text().notNull(),
    siteUrl: text().notNull(),
    isRss: integer({ mode: "boolean" }).notNull(),
});

export const actionRelations = relations(action, ({ one, many }) => ({
    member: one(member, {
        fields: [action.memberDiscord],
        references: [member.discord],
    }),
    actionItems: many(actionItem),
}));

export const actionItem = sqliteTable("ActionItem", {
    id: integer().primaryKey({ autoIncrement: true }),
    actionId: integer().notNull().references(() => action.id),
    title: text(),
    url: text().notNull(),
    description: text().notNull(),
    date: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const actionItemRelations = relations(actionItem, ({ one }) => ({
    action: one(action, {
        fields: [actionItem.actionId],
        references: [action.id],
    }),
}));

export const member = sqliteTable("Member", {
    discord: text().primaryKey(),
    alias: text().notNull(),
    site: text(),
    addedRingToSite: integer({ mode: "boolean" }).notNull(),
    color: text().notNull(),
});

export const memberRelations = relations(member, ({ many }) => ({
    words: many(word),
    motions: many(motion),
    sounds: many(sound),
    actions: many(action),
}));

export const motion = sqliteTable("Motion", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    youtubeUrl: text().notNull(),
    memberDiscord: text().notNull().references(() => member.discord),
    date: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
});

export const motionRelations = relations(motion, ({ one }) => ({
    member: one(member, {
        fields: [motion.memberDiscord],
        references: [member.discord],
    }),
}));

export const sound = sqliteTable("Sound", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    memberDiscord: text().notNull().references(() => member.discord),
    youtubeUrl: text(),
    soundcloudUrl: text(),
    date: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    trackType: text({ enum: ["mp3", "wav"] }).notNull(),
    coverType: text({ enum: ["jpg", "png"] }).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
});

export const soundRelations = relations(sound, ({ one }) => ({
    member: one(member, {
        fields: [sound.memberDiscord],
        references: [member.discord],
    }),
}));

export const word = sqliteTable("Word", {
    id: integer().primaryKey({ autoIncrement: true }),
    title: text().notNull(),
    memberDiscord: text().notNull().references(() => member.discord),
    date: text().default(sql`(CURRENT_TIMESTAMP)`).notNull(),
    tags: text({ mode: "json" }).$type<string[]>().default([]).notNull(),
    deleted: integer({ mode: "boolean" }).default(false).notNull(),
});

export const wordRelations = relations(word, ({ one }) => ({
    member: one(member, {
        fields: [word.memberDiscord],
        references: [member.discord],
    }),
}));
