import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { and, desc, eq } from "drizzle-orm";
import db, { wordId } from "../database/db";
import { Member, Word, Sound, Sight, Motion } from "../database/schema";

export const prerender = false;

function slug(slugType: string, id: number, title: string): string {
    return `/${slugType}/${id}-${title.toLowerCase().replaceAll(/[\s_-]+/g, "-")}`;
}

export const GET: APIRoute = async ({ site, params }) => {
    const things: {
        id?: number;
        title: string;
        date: Date;
        type: "sounds" | "sights" | "motions" | "words";
    }[] = [];

    if (params.rss === "rss" || params.rss === "feed" || params.rss === "atom" || params.rss === "rss_sounds" || params.rss === "feed_sounds" || params.rss === "atom_sounds")
        things.push(...await db.select({
            id: Sound.id,
            title: Sound.title,
            date: Sound.date,
        })
            .from(Sound)
            .innerJoin(Member, eq(Sound.memberDiscord, Member.discord))
            .where(and(eq(Sound.deleted, false), eq(Member.deleted, false)))
            .orderBy(desc(Sound.id))
            .then((sounds) => sounds.map(sound => ({ ...sound, type: "sounds" as const })))
        );

    if (params.rss === "rss" || params.rss === "feed" || params.rss === "atom" || params.rss === "rss_sights" || params.rss === "feed_sights" || params.rss === "atom_sights")
        things.push(...await db.select({
            id: Sight.id,
            title: Sight.title,
            date: Sight.date,
        })
            .from(Sight)
            .innerJoin(Member, eq(Sight.memberDiscord, Member.discord))
            .where(and(eq(Sight.deleted, false), eq(Member.deleted, false)))
            .orderBy(desc(Sight.id))
            .then((sights) => sights.map(sight => ({ ...sight, type: "sights" as const })))
        );

    if (params.rss === "rss" || params.rss === "feed" || params.rss === "atom" || params.rss === "rss_motions" || params.rss === "feed_motions" || params.rss === "atom_motions")
        things.push(...await db.select({
            id: Motion.id,
            title: Motion.title,
            date: Motion.date,
        })
            .from(Motion)
            .innerJoin(Member, eq(Motion.memberDiscord, Member.discord))
            .where(and(eq(Motion.deleted, false), eq(Member.deleted, false)))
            .orderBy(desc(Motion.id))
            .then((motions) => motions.map(motion => ({ ...motion, type: "motions" as const })))
        );

    if (params.rss === "rss" || params.rss === "feed" || params.rss === "atom" || params.rss === "rss_words" || params.rss === "feed_words" || params.rss === "atom_words") {
        things.push(...await db.select({
            title: Word.title,
            date: Word.date,
        })
            .from(Word)
            .innerJoin(Member, eq(Word.memberDiscord, Member.discord))
            .where(and(eq(Word.deleted, false), eq(Member.deleted, false)))
            .orderBy(desc(Word.id))
            .then((words) => words.map(word => ({ ...word, type: "words" as const })))
        );
    }

    const combinedItems = [
        ...things.map((item) => ({
            title: item.title,
            link: item.type === "words" ? `/words/${wordId({ date: item.date })}` : slug(item.type, item.id!, item.title),
            pubDate: item.date,
            categories: [item.type.slice(0, -1).charAt(0).toUpperCase() + item.type.slice(1, -1)],
        })),
    ];

    return rss({
        title: "LaTeX 4000's Words",
        description: "A collection of things by members in LaTeX 4000. For more specific feeds, see the /rss_sounds.xml, /rss_sights.xml, /rss_motions.xml, and /rss_words.xml",
        site: site ?? "",
        items: combinedItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()).slice(0, 20),
    });
};
