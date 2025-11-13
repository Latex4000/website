import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import db, { wordId } from "../database/db";
import { Motion, Sight, Sound, Word } from "../database/schema";

export const prerender = false;

const slugify = (value: string): string =>
    value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const staticRoutes: Array<{ path: string; priority: string }> = [
    { path: "/", priority: "1.0" },
    { path: "/sounds", priority: "0.8" },
    { path: "/motions", priority: "0.8" },
    { path: "/sights", priority: "0.8" },
    { path: "/words", priority: "0.8" },
    { path: "/actions", priority: "0.7" },
    { path: "/things", priority: "0.6" },
    { path: "/visions", priority: "0.5" },
    { path: "/sensations", priority: "0.5" },
    { path: "/watcher", priority: "0.3" },
    { path: "/actions-help", priority: "0.1" },
    { path: "/messages", priority: "0.1" },
    { path: "/corp/sso/begin", priority: "0" },
    { path: "/corp/sso/tickethelp", priority: "0" },
];

type UrlEntry = {
    loc: string;
    lastmod?: string;
    // changefreq?: string; I aint doing this shit
    priority: string;
};

const mapStaticEntries = (origin: URL): UrlEntry[] =>
    staticRoutes.map(({ path, priority }) => ({
        loc: new URL(path, origin).href,
        priority,
    }));

const mapSoundEntries = (origin: URL, sounds: Array<{ id: number; title: string; date: Date }>): UrlEntry[] =>
    sounds.map((sound) => ({
        loc: new URL(`/sounds/${sound.id}-${slugify(sound.title)}`, origin).href,
        lastmod: sound.date.toISOString(),
        priority: "0.7",
    }));

const mapMotionEntries = (origin: URL, motions: Array<{ id: number; title: string; date: Date }>): UrlEntry[] =>
    motions.map((motion) => ({
        loc: new URL(`/motions/${motion.id}-${slugify(motion.title)}`, origin).href,
        lastmod: motion.date.toISOString(),
        priority: "0.7",
    }));

const mapSightEntries = (origin: URL, sights: Array<{ id: number; title: string; date: Date }>): UrlEntry[] =>
    sights.map((sight) => ({
        loc: new URL(`/sights/${sight.id}-${slugify(sight.title)}`, origin).href,
        lastmod: sight.date.toISOString(),
        priority: "0.7",
    }));

const mapWordEntries = (origin: URL, words: Array<{ date: Date }>): UrlEntry[] =>
    words.map((word) => ({
        loc: new URL(`/words/${wordId(word)}`, origin).href,
        lastmod: word.date.toISOString(),
        priority: "0.7",
    }));

const renderUrl = ({ loc, lastmod, priority }: UrlEntry): string => {
    const parts = [`<loc>${loc}</loc>`];
    if (lastmod) parts.push(`<lastmod>${lastmod}</lastmod>`);
    parts.push(`<priority>${priority}</priority>`); // Ordering
    return `<url>${parts.join("")}</url>`;
};

const renderSitemap = (entries: UrlEntry[]): string =>
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n` +
    entries.map(renderUrl).join("\n") +
    "\n</urlset>\n";

export const GET: APIRoute = async ({ site }) => {
    const fallbackSite = import.meta.env.PUBLIC_SITE_URL ?? "https://nonacademic.net";
    const origin = site ?? new URL(fallbackSite);

    const [sounds, motions, sights, words] = await Promise.all([
        db
            .select({ id: Sound.id, title: Sound.title, date: Sound.date })
            .from(Sound)
            .where(eq(Sound.deleted, false)),
        db
            .select({ id: Motion.id, title: Motion.title, date: Motion.date })
            .from(Motion)
            .where(eq(Motion.deleted, false)),
        db
            .select({ id: Sight.id, title: Sight.title, date: Sight.date })
            .from(Sight)
            .where(eq(Sight.deleted, false)),
        db
            .select({ date: Word.date })
            .from(Word)
            .where(eq(Word.deleted, false)),
    ]);

    const entries: UrlEntry[] = [
        ...mapStaticEntries(origin),
        ...mapSoundEntries(origin, sounds),
        ...mapMotionEntries(origin, motions),
        ...mapSightEntries(origin, sights),
        ...mapWordEntries(origin, words),
    ];

    const xml = renderSitemap(entries);

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
};
