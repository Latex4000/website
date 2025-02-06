import { Action, ActionItem, db, eq, inArray, Member, not } from 'astro:db';
import { atom, map, onSet } from 'nanostores';
import { detectFeedType, type FeedType } from '../server/rss';
import type { ActionItemType } from '../../db/config';
import { paginationQuery } from '../server/pagination';

export interface ActionList {
    id: number;
    username: string;
    title: string;
    description: string;
    url: string;
    type: FeedType;
}

const rawActions: {
    id: number;
    username: string;
    title: string;
    description: string;
    url: string;
}[] = await db
    .select({
        id: Action.id,
        username: Member.alias,
        title: Action.title,
        description: Action.description,
        url: Action.url,
    })
    .from(Action)
    .innerJoin(Member, eq(Action.memberDiscord, Member.discord));

const actions: ActionList[] = rawActions.map((row) => ({
    ...row,
    type: detectFeedType(row.url),
}));

const basicURL = new URLSearchParams();
basicURL.append('pageSize', '100');
const {
    things: actionItems,
    prevCursor,
    nextCursor,
} = await paginationQuery(basicURL, ActionItem).then(
    async (res) => {
        try {
            const json = await res.json();
            if ("error" in json) return { things: [] };
            return json as {
                things: ActionItemType[];
                prevCursor?: number;
                nextCursor?: number;
            };
        } catch (e) {
            console.error(e);
            return { things: [] };
        }
    }
);

export const actionsRef = map(actions);
export const prevCursorRef = atom(prevCursor);
export const nextCursorRef = atom(nextCursor);
export const filtersRef = map(actions.reduce(
    (acc, action) => {
        acc[action.id] = true;
        return acc;
    },
    {} as Record<number, boolean>
));
export const typeFiltersRef = map(actions.reduce(
    (acc, action) => {
        acc[action.type] = true;
        return acc;
    },
    {} as Record<FeedType, boolean>
));
export const actionItemsRef = map(actionItems);

export function updateActionItems(direction?: "next" | "prev") {
    const cursor = direction === "prev" ? prevCursorRef.get() : nextCursorRef.get();
    const url = new URLSearchParams();
    if (cursor)
        url.append('cursor', cursor.toString());
    url.append('direction', direction ?? 'next');
    url.append('pageSize', '100');
    // if any values in filters are false, then add them to a not query
    const notFilters = not(inArray(
        ActionItem.actionID,
        Object.entries(filtersRef.get())
            .filter(([, value]) => !value)
            .map(([key]) => parseInt(key))
    ));
    paginationQuery(url, ActionItem, notFilters).then(
        async (res) => {
            try {
                const json = await res.json();
                if ("error" in json) return;
                actionItemsRef.set(json.things);
                prevCursorRef.set(json.prevCursor);
                nextCursorRef.set(json.nextCursor);
            } catch (e) {
                console.error(e);
            }
        }
    );
}

// on filter change run updateActionItems
onSet(filtersRef, () => updateActionItems());
onSet(typeFiltersRef, () => updateActionItems());