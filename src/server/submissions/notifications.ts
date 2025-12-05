import { submissionConfig } from "./config";

export async function postToDiscordFeed(content: string): Promise<void> {
    if (!submissionConfig.discordFeedWebhook)
        return;

    const response = await fetch(submissionConfig.discordFeedWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to post to Discord feed: ${response.status} ${body}`);
    }
}

export async function tryPostToDiscordFeed(content: string): Promise<boolean> {
    if (!submissionConfig.discordFeedWebhook)
        return false;

    try {
        await postToDiscordFeed(content);
        return true;
    } catch (error) {
        console.error("Failed to post to Discord feed", error);
        return false;
    }
}
