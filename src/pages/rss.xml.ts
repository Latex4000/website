import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { db, Word } from "astro:db";
import { wordId } from "../../db/config";

export const prerender = false;

export const GET: APIRoute = async (context) => {
    const words = await db.select().from(Word);

    return rss({
        title: "Latex 4000's Words",
        description: "A collection of articles by members in Latex 4000",
        site: context.site ?? "",
        items: words.map((word) => ({
            title: word.title,
            link: `/words/${wordId(word)}`,
            pubDate: word.date,
            author: "L",
        })),
    });
};
