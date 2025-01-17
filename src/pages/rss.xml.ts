import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async (context) => {
    const words = await getCollection("words"); 
    return rss({
        title: "Latex 4000's Words",
        description: "A collection of articles by members in Latex 4000",
        site: context.site || "",
        items: words.map(word => ({
            title: word.data.title,
            link: `/words/${word.id}`,
            pubDate: word.data.date,
            author: word.data.author.replace("\\", ""),
        })),
    })
}