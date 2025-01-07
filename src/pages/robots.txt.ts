import type { APIRoute } from "astro";

const aiRobotsTxt = await fetch("https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/refs/heads/main/robots.txt").then((res) => res.text());

const getRobotsTxt = (sitemapURL: URL) => `
${aiRobotsTxt}

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
    const sitemapURL = new URL("sitemap-index.xml", site);
    return new Response(getRobotsTxt(sitemapURL));
};