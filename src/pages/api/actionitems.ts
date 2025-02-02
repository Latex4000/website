import type { APIRoute } from "astro";
import { paginationQuery } from "../../server/pagination";
import { ActionItem } from "astro:db";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => paginationQuery(url.searchParams, ActionItem);