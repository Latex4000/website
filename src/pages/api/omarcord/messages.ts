import type { APIRoute } from "astro";
import { desc } from "drizzle-orm";
import db from "../../../database/db";
import { OmarcordMessage } from "../../../database/schema";
import { jsonError, jsonResponse } from "../../../server/responses";

export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        const messages = await db
            .select({
                id: OmarcordMessage.id,
                username: OmarcordMessage.username,
                message: OmarcordMessage.message,
                createdAt: OmarcordMessage.createdAt,
            })
            .from(OmarcordMessage)
            .orderBy(desc(OmarcordMessage.createdAt))
            .limit(100);

        return jsonResponse({
            messages: messages.reverse().map((msg) => ({
                id: msg.id,
                username: msg.username,
                message: msg.message,
                createdAt: msg.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Failed to fetch Omarcord messages", error);
        return jsonError("Unable to fetch messages", 500);
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { username, message } = body;

        if (!username || typeof username !== "string" || username.trim().length === 0) {
            return jsonError("Username is required", 400);
        }

        if (!message || typeof message !== "string" || message.trim().length === 0) {
            return jsonError("Message is required", 400);
        }

        if (username.length > 50) {
            return jsonError("Username must be 50 characters or less", 400);
        }

        if (message.length > 2000) {
            return jsonError("Message must be 2000 characters or less", 400);
        }

        const result = await db.insert(OmarcordMessage).values({
            username: username.trim(),
            message: message.trim(),
        }).returning();

        const newMessage = result[0];

        if (!newMessage) {
            return jsonError("Failed to create message", 500);
        }

        return jsonResponse({
            message: {
                id: newMessage.id,
                username: newMessage.username,
                message: newMessage.message,
                createdAt: newMessage.createdAt.toISOString(),
            },
        }, 201);
    } catch (error) {
        console.error("Failed to post Omarcord message", error);
        return jsonError("Unable to post message", 500);
    }
};
