import type { InferSelectModel } from 'drizzle-orm';
import { atom, map } from 'nanostores';
import { type FeedType } from '../server/rss';
import type { Action, ActionItem } from '../database/schema';

export type ActionList = InferSelectModel<typeof Action> & {
    username: string;
    type: FeedType;
}

export type ActionItemList = InferSelectModel<typeof ActionItem> & { action: ActionList };

export const actionsRef = atom<ActionList[]>([]);
export const prevCursorRef = atom<Date | undefined>(undefined);
export const nextCursorRef = atom<Date | undefined>(undefined);
export const actionItemsRef = atom<ActionItemList[]>([]);
export const filtersRef = map<Record<number, boolean>>({});
