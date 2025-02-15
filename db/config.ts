import { column, defineDb, defineTable, NOW } from "astro:db";

export const Member = defineTable({
    columns: {
        discord: column.text({ primaryKey: true }),
        alias: column.text({ unique: true }),
        site: column.text({ unique: true, optional: true }),
        addedRingToSite: column.boolean(),
        color: column.text(),
    },
});

export const Sound = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        title: column.text(),
        memberDiscord: column.text({
            references: () => Member.columns.discord,
        }),
        youtubeUrl: column.text({ optional: true }),
        soundcloudUrl: column.text({ optional: true }),
        date: column.date({ default: NOW }),
        tags: column.json({ default: [] }),
        trackType: column.text(),
        coverType: column.text(),
        deleted: column.boolean({ default: false }),
    },
});

export const Word = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        deleted: column.boolean({ default: false }),
        date: column.date({ default: NOW, unique: true }),
        memberDiscord: column.text({
            references: () => Member.columns.discord,
        }),
        tags: column.json({ default: [] }),
        title: column.text(),
    },
});

export const Motion = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        title: column.text(),
        youtubeUrl: column.text(),
        memberDiscord: column.text({
            references: () => Member.columns.discord,
        }),
        date: column.date({ default: NOW }),
        tags: column.json({ default: [] }),
        deleted: column.boolean({ default: false }),
    },
});

export const Action = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        memberDiscord: column.text({
            references: () => Member.columns.discord,
        }),
        title: column.text(),
        description: column.text(),
        url: column.text({ unique: true }),
        siteUrl: column.text({ unique: true }),
        isRSS: column.boolean(),
    },
});

export const ActionItem = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        actionID: column.number({
            references: () => Action.columns.id,
        }),
        title: column.text({ optional: true }),
        description: column.text(),
        url: column.text({ unique: true }),
        date: column.date({ default: NOW }),
    },
});

// https://astro.build/db/config
export default defineDb({
    tables: { Member, Sound, Word, Motion, Action, ActionItem },
});
