import { atom, map } from 'nanostores';
import { FEED_TYPE, type FeedType } from '../server/rss';
import type { ActionItemType } from '../../db/types';

export interface ActionList {
    id: number;
    username: string;
    title: string;
    description: string;
    url: string;
    type: FeedType;
}

export const actionsRef = atom<ActionList[]>([]);
export const prevCursorRef = atom<number | undefined>(undefined);
export const nextCursorRef = atom<number | undefined>(undefined);
export const actionItemsRef = atom<ActionItemType[]>([]);
export const filtersRef = map<Record<number, boolean>>({});
export const typeFiltersRef = map(FEED_TYPE.reduce((acc, type) => ({ ...acc, [type]: true }), {} as Record<FeedType, boolean>));