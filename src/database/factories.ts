import { faker } from "@faker-js/faker";
import defineFactory from "./defineFactory";
import { Action, ActionItem, Member, Motion, Sight, Sound, Word } from "./schema";

const tags = () => faker.helpers.multiple(() => faker.word.adjective(), { count: { min: 0, max: 5 } });

export const ActionFactory = defineFactory(Action, {
    memberDiscord: () => { throw new Error("Not implemented"); },
    title: () => faker.commerce.department(),
    description: () => faker.lorem.sentence(),
    url: () => faker.internet.url(),
    siteUrl: () => faker.internet.url(),
    isRSS: () => faker.datatype.boolean(),
});

export const ActionItemFactory = defineFactory(ActionItem, {
    actionID: () => { throw new Error("Not implemented"); },
    title: () => faker.helpers.maybe(() => faker.commerce.product()),
    url: () => faker.internet.url(),
    description: () => faker.lorem.sentence(),
    date: () => faker.date.recent(),
});

export const MemberFactory = defineFactory(Member, {
    discord: () => faker.string.numeric(18),
    alias: () => faker.person.firstName(),
    site: () => faker.helpers.maybe(() => faker.internet.url()),
    color: () => faker.internet.color(),

    addedRingToSite: ({ site }) => site != null && faker.datatype.boolean(),
});

export const MotionFactory = defineFactory(Motion, {
    date: () => faker.date.recent(),
    memberDiscord: () => { throw new Error("Not implemented"); },
    tags,
    title: () => faker.commerce.productName(),
    youtubeUrl: () => faker.internet.url(),
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

export const WordFactory = defineFactory(Word, {
    title: () => faker.book.title(),
    memberDiscord: () => { throw new Error("Not implemented"); },
    date: () => faker.date.recent(),
    tags,
});
