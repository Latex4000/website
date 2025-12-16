import { hash, randomBytes } from "node:crypto";
import { faker } from "@faker-js/faker";
import { ActionFactory, ActionItemFactory, MemberFactory, MotionFactory, SightFactory, SoundFactory, WordFactory, TicketFactory } from "./factories";

export default async function seed() {
    const members = await new MemberFactory().count(20).create();

    members.push(...await new MemberFactory().create({ alias: "Obnoxiously Long Name" }));

    if (process.env.DEVELOPER_DISCORD_ID) {
        members.push(...await new MemberFactory().create({
            alias: "Developer",
            discord: process.env.DEVELOPER_DISCORD_ID,
        }));
        const ticket = randomBytes(20);
        await new TicketFactory().create({
            memberDiscord: process.env.DEVELOPER_DISCORD_ID,
            createdAt: new Date(),
            hash: hash("sha256", ticket, "base64"),
        });
        console.log("Developer ticket: ", ticket.toString("base64url"));
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
}
