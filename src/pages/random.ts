import type { APIRoute } from "astro";

const urls = [
    "/",
    "/sounds",
    "/words",
    // "/actions",
]

export const GET: APIRoute = (context) => {
    const randomUrl = urls[Math.floor(Math.random() * urls.length)]!;
    return context.redirect(randomUrl, 307);
};