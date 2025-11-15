import Parser from "rss-parser";

const parser = new Parser();

export async function parseRssFeed(url: string) {
    const feed = await parser.parseURL(url);
    if (!feed.link || !feed.items)
        throw new Error("Invalid RSS/Atom feed (missing link or items)");
    if (feed.items.length && !feed.items[0]?.link)
        throw new Error("Invalid RSS/Atom feed items (missing link)");
    return feed;
}
