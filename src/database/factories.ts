import { faker } from "@faker-js/faker";
import defineFactory from "./defineFactory";
import { Action, ActionItem, Member, Motion, Session, Sight, Sound, Ticket, Word } from "./schema";

function unique<T>(fn: () => T): () => T {
    const used = new Set<T>();

    return () => {
        while (true) {
            const value = fn();

            if (!used.has(value)) {
                used.add(value);
                return value;
            }
        }
    };
}

const tags = () => faker.helpers.multiple(() => faker.word.adjective(), { count: { min: 0, max: 5 } });

export const ActionFactory = defineFactory(Action, {
    memberDiscord: () => { throw new Error("Not implemented"); },
    title: () => faker.commerce.department(),
    description: () => faker.lorem.sentence(),
    url: unique(() => faker.internet.url()),
    siteUrl: unique(() => faker.internet.url()),
    isRSS: () => faker.datatype.boolean(),
});

export const ActionItemFactory = defineFactory(ActionItem, {
    actionID: () => { throw new Error("Not implemented"); },
    title: () => faker.helpers.maybe(() => faker.commerce.product()),
    url: unique(() => faker.internet.url()),
    description: () => faker.lorem.sentence(),
    date: () => faker.date.recent(),
});

export const MemberFactory = defineFactory(Member, {
    discord: () => faker.string.numeric(18),
    alias: unique(() => faker.person.firstName()),
    site: () => faker.helpers.maybe(unique(() => faker.internet.url())),
    color: () => faker.color.rgb(),

    addedRingToSite: ({ site }) => site != null && faker.datatype.boolean(),
});

export const MotionFactory = defineFactory(Motion, {
    date: () => faker.date.recent(),
    memberDiscord: () => { throw new Error("Not implemented"); },
    tags,
    title: () => faker.commerce.productName(),
    youtubeUrl: () => faker.internet.url(),
});

export const SessionFactory = defineFactory(Session, {
    id: () => faker.string.alphanumeric(32),
    expiresAt: () => faker.date.soon(),
});

export const SightFactory = defineFactory(Sight, {
    title: () => faker.commerce.productName(),
    description: () => faker.lorem.sentence(),
    memberDiscord: () => { throw new Error("Not implemented"); },
    date: () => faker.date.recent(),
    tags,
});

export const SoundFactory = defineFactory(Sound, {
    title: () => faker.music.songName(),
    memberDiscord: () => { throw new Error("Not implemented"); },
    youtubeUrl: () => faker.helpers.maybe(() => faker.internet.url()),
    soundcloudUrl: () => faker.helpers.maybe(() => faker.internet.url()),
    date: () => faker.date.recent(),
    tags: () => faker.helpers.multiple(() => faker.music.genre(), { count: { min: 0, max: 5 } }),
    trackType: "mp3",
    coverType: "jpg",
});

export const TicketFactory = defineFactory(Ticket, {
    memberDiscord: () => { throw new Error("Not implemented"); },
    createdAt: () => faker.date.recent(),
    hash: () => faker.string.alphanumeric(32),
});

export const WordFactory = defineFactory(Word, {
    title: () => faker.book.title(),
    memberDiscord: () => { throw new Error("Not implemented"); },
    date: unique(() => faker.date.recent()),
    tags,
});
