import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = (context) => {
    const idMatch = context.params.id?.match(/^\d+/);

    if (idMatch == null) {
        return new Response(null, { status: 404 });
    }

    context.locals.sightId = Number.parseInt(idMatch[0], 10);

    return context.rewrite("/sights");
};

declare global {
    namespace App {
        interface Locals {
            sightId?: number;
        }
    }
}
