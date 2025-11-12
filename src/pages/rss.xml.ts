import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { and, desc, eq } from "drizzle-orm";
import db, { wordId } from "../database/db";
import { Member, Word, Sound, Sight, Motion } from "../database/schema";

export const prerender = false;

function slug(slugType: string, id: number, title: string): string {
    return `/${slugType}/${id}-${title.toLowerCase().replaceAll(/[\s_-]+/g, "-")}`;
}

export const GET: APIRoute = async (context) => {
    const sounds = await db.select({
        id: Sound.id,
        title: Sound.title,
        date: Sound.date,
    })
        .from(Sound)
        .innerJoin(Member, eq(Sound.memberDiscord, Member.discord))
        .where(and(eq(Sound.deleted, false), eq(Member.deleted, false)))
        .orderBy(desc(Sound.id));

    const sights = await db.select({
        id: Sight.id,
        title: Sight.title,
        date: Sight.date,
    })
        .from(Sight)
        .innerJoin(Member, eq(Sight.memberDiscord, Member.discord))
        .where(and(eq(Sight.deleted, false), eq(Member.deleted, false)))
        .orderBy(desc(Sight.id));

    const motions = await db.select({
        id: Motion.id,
        title: Motion.title,
        date: Motion.date,
    })
        .from(Motion)
        .innerJoin(Member, eq(Motion.memberDiscord, Member.discord))
        .where(and(eq(Motion.deleted, false), eq(Member.deleted, false)))
        .orderBy(desc(Motion.id));

    const words = await db.select({
        title: Word.title,
        date: Word.date,
    })
        .from(Word)
        .innerJoin(Member, eq(Word.memberDiscord, Member.discord))
        .where(and(eq(Word.deleted, false), eq(Member.deleted, false)))
        .orderBy(desc(Word.id));

    const combinedItems = [
        ...sounds.map((item) => ({
            title: item.title,
            link: slug("sounds", item.id, item.title),
            pubDate: item.date,
            categories: ["Sound"],
            author: "L",
        })),
        ...sights.map((item) => ({
            title: item.title,
            link: slug("sights", item.id, item.title),
            pubDate: item.date,
            categories: ["Sight"],
            author: "L",
        })),
        ...motions.map((item) => ({
            title: item.title,
            link: slug("motions", item.id, item.title),
            pubDate: item.date,
            categories: ["Motion"],
            author: "L",
        })),
        ...words.map((word) => ({
            title: word.title,
            link: `/words/${wordId(word)}`,
            pubDate: word.date,
            categories: ["Word"],
            author: "L",
        }))
    ];

    return rss({
        title: "LaTeX 4000's Words",
        description: "A collection of articles by members in LaTeX 4000",
        site: context.site ?? "",
        items: combinedItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()).slice(0, 20),
    });
};
