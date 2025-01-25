import type { APIRoute } from "astro";

export const prerender = false;

const urls = [
    "/",
    "/sounds",
    "/words",
    // "/actions",
];

export const GET: APIRoute = (context) => {
    const ref = context.request.headers.get("referer");
    const urlsWithoutRef = urls.filter(
        (url) => ref !== `${context.url.origin}${url}`,
    );
    const randomUrl =
        urlsWithoutRef[Math.floor(Math.random() * urlsWithoutRef.length)]!;
    return context.redirect(randomUrl, 307);
};
