import { faker } from "@faker-js/faker";
import { ActionFactory, ActionItemFactory, MemberFactory, MotionFactory, SightFactory, SoundFactory, TunicwildFactory, WordFactory } from "./factories";
import { writeFile } from "fs/promises";
import { join } from "path";

if (!process.env.TUNICWILDS_UPLOAD_DIRECTORY) {
    throw new Error("TUNICWILDS_UPLOAD_DIRECTORY not set");
}

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

    const tunicwilds = await new TunicwildFactory().count(10).create();

    const placeholderAudioResponse = await fetch("https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3");
    const placeholderAudio = await placeholderAudioResponse.bytes();

    for (const tunicwild of tunicwilds) {
        await writeFile(
            join(process.env.TUNICWILDS_UPLOAD_DIRECTORY!, tunicwild.id.toString()),
            placeholderAudio,
        );
    }
}
