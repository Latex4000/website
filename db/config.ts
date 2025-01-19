import { column, defineDb, defineTable, NOW } from 'astro:db';

export const Member = defineTable({
  columns: {
    discord: column.text({ primaryKey: true }),
    alias: column.text({ unique: true }),
    site: column.text({ unique: true }),
    addedRingToSite: column.boolean(),
  },
  indexes: [
    { on: ["discord"], unique: true },
    { on: ["alias"], unique: true },
    { on: ["site"], unique: true },
  ],
});

export interface Member {
  discord: string;
  alias: string;
  site: string;
  addedRingToSite: boolean;
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

// https://astro.build/db/config
export default defineDb({
  tables: { Member, Sound }
});