import { column, defineDb, defineTable, NOW, sql } from 'astro:db';

export const Member = defineTable({
  columns: {
    discord: column.text({ primaryKey: true }),
    alias: column.text({ unique: true }),
    site: column.text({ unique: true, optional: true }),
    addedRingToSite: column.boolean(),
    color: column.text(),
  },
});

export interface MemberType {
  discord: string;
  alias: string;
  site: string | null;
  addedRingToSite: boolean;
  color: string;
}

export const Sound = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    title: column.text(),
    youtubeUrl: column.text(),
    soundcloudUrl: column.text(),
    date: column.date({ default: NOW }),
    tags: column.json({ default: [] }),
    trackType: column.text(),
    coverType: column.text(),
  },
});

export interface SoundType {
  id: number;
  title: string;
  youtubeUrl: string;
  soundcloudUrl: string;
  date: Date;
  tags: string[];
  trackType: "mp3" | "wav";
  coverType: "jpg" | "png";
}

type SoundTypeInDb = Omit<SoundType, 'tags' | 'trackType' | 'coverType'> & {
  tags: unknown;
  trackType: string;
  coverType: string;
};

export function soundFromDb(sound: SoundTypeInDb): SoundType {
  if (
    Array.isArray(sound.tags) && sound.tags.every((tag) => typeof tag === 'string') &&
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
    date: column.date({ default: NOW, unique: true }),
    memberDiscord: column.text({ references: () => Member.columns.discord }),
    tags: column.json({ default: [] }),
    title: column.text(),
  },
});

export interface WordType {
  id: number;
  date: Date;
  memberDiscord: MemberType['discord'];
  tags: string[];
  title: string;
}

type WordTypeInDb = Omit<WordType, 'tags'> & { tags: unknown; };

export function wordFromDb(word: WordTypeInDb): WordType {
  if (Array.isArray(word.tags) && word.tags.every((tag) => typeof tag === 'string')) {
    return word as WordType;
  }

  throw new TypeError();
}

export function wordId(word: Pick<WordType, 'date'>): string {
  return Math.floor(word.date.getTime() / 1000).toString(10);
}

// https://astro.build/db/config
export default defineDb({
  tables: { Member, Sound, Word },
});

export function encodeSqlDate(date: Date): ReturnType<typeof sql.raw> {
  return sql.raw(`'${date.toISOString().replace("T", " ").slice(0, 19)}'`);
}
