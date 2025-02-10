import { column, defineDb, defineTable, NOW, sql } from "astro:db";
import type { MotionType, SoundType, WordType } from "./types";

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

type SoundTypeInDb = Omit<SoundType, "tags" | "trackType" | "coverType"> & {
    tags: unknown;
    trackType: string;
    coverType: string;
};

export function soundFromDb(sound: SoundTypeInDb): SoundType {
    if (
        Array.isArray(sound.tags) &&
        sound.tags.every((tag) => typeof tag === "string") &&
        (sound.trackType === "mp3" || sound.trackType === "wav") &&
        (sound.coverType === "jpg" || sound.coverType === "png")
    ) {
        return sound as SoundType;
    }

    throw new TypeError();
}

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

type WordTypeInDb = Omit<WordType, "tags"> & { tags: unknown };

export function wordFromDb(word: WordTypeInDb): WordType {
    if (
        Array.isArray(word.tags) &&
        word.tags.every((tag) => typeof tag === "string")
    ) {
        return word as WordType;
    }

    throw new TypeError();
}

export function wordId(word: Pick<WordType, "date">): string {
    return Math.floor(word.date.getTime() / 1000).toString(10);
}

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

type MotionTypeInDb = Omit<MotionType, "tags"> & {
    tags: unknown;
};

export function motionFromDb(motion: MotionTypeInDb): MotionType {
    if (
        Array.isArray(motion.tags) &&
        motion.tags.every((tag) => typeof tag === "string")
    ) {
        return motion as MotionType;
    }

    throw new TypeError();
}

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

export function encodeSqlDate(date: Date): ReturnType<typeof sql.raw> {
    return sql.raw(`'${date.toISOString().replace("T", " ").slice(0, 19)}'`);
}
