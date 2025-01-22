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

export interface Member {
  discord: string;
  alias: string;
  site: string | null;
  addedRingToSite: boolean;
  color: string;
}

export const Sound = defineTable({
  columns: {
    title: column.text(),
    youtubeUrl: column.text(),
    soundcloudUrl: column.text(),
    date: column.date({ default: NOW }),
  },
});

export interface Sound {
  title: string;
  youtubeUrl: string;
  soundcloudUrl: string;
  date: Date;
}

export const Word = defineTable({
  columns: {
    date: column.date({ default: NOW, unique: true }),
    memberDiscord: column.text({ references: () => Member.columns.discord }),
    tags: column.json({ default: [] }),
    title: column.text(),
  },
});

export interface WordType {
  date: Date;
  memberDiscord: Member['discord'];
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
