import { faker } from "@faker-js/faker";
import { ActionFactory, ActionItemFactory, MemberFactory, MotionFactory, SightFactory, SoundFactory, TunicwildFactory, WordFactory } from "./factories";
import { writeFile } from "fs/promises";

export default async function seed() {
    const members = await new MemberFactory().count(20).create();

    members.push(...await new MemberFactory().create({ alias: "Obnoxiously Long Name" }));

    if (process.env.DEVELOPER_DISCORD_ID) {
        members.push(...await new MemberFactory().create({
            alias: "Developer",
            discord: process.env.DEVELOPER_DISCORD_ID,
        }));
    }

    const actions = await new ActionFactory().count(10).create({
        memberDiscord: () => faker.helpers.arrayElement(members.map((member) => member.discord)),
    });

    await new ActionItemFactory().count(50).create({
        actionID: () => faker.helpers.arrayElement(
            actions.filter((action) => action.isRSS).map((action) => action.id),
        ),
    });

    await new MotionFactory().count(10).create({
        memberDiscord: () => faker.helpers.arrayElement(members.map((member) => member.discord)),
        youtubeUrl: () => faker.helpers.arrayElement([
            "https://www.youtube.com/watch?v=V2oSHweiRgI",
            "https://www.youtube.com/watch?v=bTFUeY6_7Kk",
            "https://www.youtube.com/watch?v=bTFUeY6_7Kk",
        ]),
    });

    await new SightFactory().count(10).create({
        memberDiscord: () => faker.helpers.arrayElement(members.map((member) => member.discord)),
    });

    await new SoundFactory().count(10).create({
        memberDiscord: () => faker.helpers.arrayElement(members.map((member) => member.discord)),
    });

    await new WordFactory().count(10).create({
        memberDiscord: () => faker.helpers.arrayElement(members.map((member) => member.discord)),
    });

    await new TunicwildFactory().count(10).create();

    // Create 10 audio files in dev/tunicwilds with placeholder audio
    const res = await fetch("https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3")
        .then((response) => response.bytes());
    for (let i = 0; i < 10; i++)
        await writeFile(`dev/tunicwilds/${i + 1}`, res);
}
