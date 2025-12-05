import { readFile, writeFile } from "node:fs/promises";
import { openAsBlob } from "node:fs";
import { soundcloudConfig } from "../config";

type SoundcloudToken = {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    last_updated: number;
};

type RefreshTokenResponse = Omit<SoundcloudToken, "last_updated">;

async function getSoundcloudAccessToken(): Promise<string> {
    if (!soundcloudConfig.clientId || !soundcloudConfig.clientSecret)
        throw new Error("SoundCloud credentials not configured");

    const tokenFile = await readFile("scToken.json", "utf-8");
    let token: SoundcloudToken = JSON.parse(tokenFile);
    const lastUpdated = new Date(token.last_updated || 0);
    const expiresAt = lastUpdated.getTime() + (token.expires_in || 0) * 1000;

    if (expiresAt < Date.now()) {
        const response = await fetch("https://secure.soundcloud.com/oauth/token", {
            method: "POST",
            headers: {
                Accept: "application/json; charset=utf-8",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: soundcloudConfig.clientId,
                client_secret: soundcloudConfig.clientSecret,
                refresh_token: token.refresh_token,
            }),
        });

        const refreshed = (await response.json()) as RefreshTokenResponse;
        token = {
            ...token,
            ...refreshed,
            last_updated: Date.now(),
        };
        await writeFile("scToken.json", JSON.stringify(token));
    }

    return token.access_token;
}

export async function uploadSoundcloud(
    title: string,
    description: string,
    tags: string[],
    audioPath: string,
    imagePath: string,
): Promise<string> {
    const formData = new FormData();
    formData.set("track[title]", title);
    formData.set("track[sharing]", "public");
    formData.set("track[description]", description);
    formData.set("track[tags]", tags.join(" "));
    formData.set("track[asset_data]", await openAsBlob(audioPath));
    formData.set("track[artwork_data]", await openAsBlob(imagePath));

    const response = await fetch("https://api.soundcloud.com/tracks", {
        method: "POST",
        headers: {
            Authorization: `OAuth ${await getSoundcloudAccessToken()}`,
        },
        body: formData,
    });

    const data = (await response.json()) as { id: number; permalink_url: string };
    return `${data.permalink_url}?id=${data.id}`;
}

export async function changeSoundcloudStatus(url: string, sharing: "public" | "private"): Promise<void> {
    const id = new URL(url).searchParams.get("id");
    if (!id)
        throw new Error("Invalid SoundCloud URL");

    await fetch(`https://api.soundcloud.com/tracks/${id}`, {
        method: "PUT",
        headers: {
            Authorization: `OAuth ${await getSoundcloudAccessToken()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ track: { sharing } }),
    });
}

export async function changeSoundcloudDescription(url: string, description: string): Promise<void> {
    const id = new URL(url).searchParams.get("id");
    if (!id)
        throw new Error("Invalid SoundCloud URL");

    await fetch(`https://api.soundcloud.com/tracks/${id}`, {
        method: "PUT",
        headers: {
            Authorization: `OAuth ${await getSoundcloudAccessToken()}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ track: { description } }),
    });
}
