import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = (context) => {
    const idMatch = context.params.id?.match(/^\d+/);

    if (idMatch == null) {
        return new Response(null, { status: 404 });
    }

    context.locals.soundId = Number.parseInt(idMatch[0], 10);

    return context.rewrite("/sounds");
};

declare global {
    namespace App {
        interface Locals {
            soundId?: number;
        }
    }
}
