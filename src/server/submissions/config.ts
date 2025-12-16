import { resolve } from "node:path";
import process from "node:process";

const requiredEnv = (key: string): string => {
    const value = process.env[key];
    if (!value || value.length === 0)
        throw new Error(`${key} environment variable is not set`);
    return value;
};

export const submissionConfig = {
    tmpDir: process.env.SUBMISSION_TMP_DIRECTORY
        ? resolve(process.env.SUBMISSION_TMP_DIRECTORY)
        : resolve(process.cwd(), ".tmp"),
    siteUrl: process.env.SITE_URL ?? "http://localhost:4321",
    discordFeedWebhook: process.env.DISCORD_FEED_WEBHOOK ?? null,
    botBaseUrl: process.env.SUBMISSION_BOT_BASE_URL ?? "http://localhost:5556",
    botHmacKey: process.env.SECRET_HMAC_KEY ?? null,
};

export const youtubeConfig = {
    clientId: process.env.YOUTUBE_CLIENT_ID ?? null,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET ?? null,
    redirectUri: process.env.YOUTUBE_REDIRECT_URI ?? null,
    playlists: {
        sounds: process.env.YOUTUBE_SOUNDS_PLAYLIST_ID ?? null,
        motions: process.env.YOUTUBE_MOTIONS_PLAYLIST_ID ?? null,
    },
};

type SoundcloudConfig = {
    clientId: string | null;
    clientSecret: string | null;
};

export const soundcloudConfig: SoundcloudConfig = {
    clientId: process.env.SOUNDCLOUD_CLIENT_ID ?? null,
    clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET ?? null,
};

export const canUseYoutube = Boolean(
    youtubeConfig.clientId &&
    youtubeConfig.clientSecret &&
    youtubeConfig.redirectUri
);

export const canUseSoundcloud = Boolean(
    soundcloudConfig.clientId && soundcloudConfig.clientSecret
);

export const requireSiteUrl = (path: string): string => {
    const url = new URL(path, submissionConfig.siteUrl);
    return url.toString();
};

export const ensureEnvForYoutube = (): void => {
    if (!canUseYoutube)
        throw new Error("YouTube credentials are not fully configured");
};

export const ensureEnvForSoundcloud = (): void => {
    if (!canUseSoundcloud)
        throw new Error("SoundCloud credentials are not fully configured");
};

export const getRequiredEnv = requiredEnv;
