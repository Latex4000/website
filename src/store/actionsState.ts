import { atom, map } from 'nanostores';
import { type FeedType } from '../server/rss';
import type { ActionItemType } from '../../db/types';

export interface ActionList {
    id: number;
    username: string;
    title: string;
    description: string;
    url: string;
    siteUrl: string;
    type: FeedType;
}

export type ActionItemList = Omit<ActionItemType, "actionID"> & { action: ActionList };

export const actionsRef = atom<ActionList[]>([]);
export const prevCursorRef = atom<Date | undefined>(undefined);
export const nextCursorRef = atom<Date | undefined>(undefined);
export const actionItemsRef = atom<ActionItemList[]>([]);
export const filtersRef = map<Record<number, boolean>>({});