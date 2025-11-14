import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import type { youtube_v3, Auth } from "googleapis";
import { google } from "googleapis";
import { canUseYoutube, youtubeConfig } from "../config";

class YoutubeClient {
    private auth: Auth.OAuth2Client | undefined;
    private hasAccessToken = false;
    private youtube: youtube_v3.Youtube | undefined;

    async initialize(): Promise<boolean | undefined> {
        if (!canUseYoutube)
            return;

        this.auth = new google.auth.OAuth2(
            youtubeConfig.clientId!,
            youtubeConfig.clientSecret!,
            youtubeConfig.redirectUri!,
        );
        this.youtube = google.youtube("v3");

        try {
            const tokenFile = await readFile("ytToken.json", "utf-8");
            const token = JSON.parse(tokenFile);
            this.auth.setCredentials(token);
            this.updateTokens();
            this.hasAccessToken = true;
            return true;
        } catch {
            return false;
        }
    }

    private updateTokens(): void {
        if (!this.auth)
            return;

        this.auth.on("tokens", async (tokens) => {
            if (tokens.refresh_token)
                await writeFile("ytToken.json", JSON.stringify(tokens));
        });
    }

    async getAccessToken(sendMessage: (message: string) => Promise<unknown>): Promise<void> {
        if (!this.auth || !this.youtube)
            throw new Error("YouTube client not initialized");

        const urlObj = new URL(youtubeConfig.redirectUri!);
        const port = Number(urlObj.port || 8000);

        const notify = (message: string) => sendMessage(message).catch((error) => {
            console.error(message);
            console.error(error);
        });

        const codePromise = new Promise<string>((resolve, reject) => {
            const httpServer = createServer();
            httpServer.on("request", (req, res) => {
                const reqUrl = new URL(req.url ?? "/", "http://localhost/");
                const code = reqUrl.searchParams.get("code");

                if (!code) {
                    res.writeHead(400);
                    res.write("No code provided\n");
                    reject(new Error("No code provided"));
                } else {
                    res.writeHead(200);
                    res.write("Successfully authenticated\n");
                    resolve(code);
                }

                res.end(() => httpServer.close());
            });
            httpServer.listen(port);
        });

        const authUrl = this.auth.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: [
                "https://www.googleapis.com/auth/youtube",
                "https://www.googleapis.com/auth/youtube.upload",
            ],
        });
        await notify(`Click here to authenticate with YouTube: ${authUrl}`);

        try {
            const code = await codePromise;
            const { tokens } = await this.auth.getToken(code);
            this.auth.setCredentials(tokens);
            await writeFile("ytToken.json", JSON.stringify(tokens));
            this.updateTokens();
            this.hasAccessToken = true;
        } catch (error) {
            await notify("Failed to get token for YouTube");
            throw error;
        }
    }

    async upload(
        title: string,
        description: string,
        tags: string[],
        videoPath: string,
        uploadType: "sounds" | "motions",
        imagePath?: string,
    ): Promise<youtube_v3.Schema$Video> {
        if (!this.auth || !this.youtube || !this.hasAccessToken)
            throw new Error("YouTube client not initialized");

        const response = await this.youtube.videos.insert({
            auth: this.auth,
            part: ["snippet", "status"],
            requestBody: {
                snippet: {
                    categoryId: uploadType === "sounds" ? "10" : "23",
                    title,
                    description,
                    tags,
                },
                status: {
                    privacyStatus: "public",
                    selfDeclaredMadeForKids: false,
                    containsSyntheticMedia: false,
                    license: "creativeCommon",
                },
            },
            media: {
                body: createReadStream(videoPath),
            },
        });

        const video = response.data;
        if (!video.id)
            throw new Error("Failed to upload video");

        if (imagePath) {
            await this.youtube.thumbnails.set({
                auth: this.auth,
                videoId: video.id,
                media: {
                    body: createReadStream(imagePath),
                },
            });
        }

        const playlist = youtubeConfig.playlists[uploadType];
        if (playlist) {
            await this.youtube.playlistItems.insert({
                auth: this.auth,
                part: ["snippet"],
                requestBody: {
                    snippet: {
                        playlistId: playlist,
                        resourceId: {
                            kind: "youtube#video",
                            videoId: video.id,
                        },
                    },
                },
            });
        }

        return video;
    }

    async getVideo(url: string): Promise<youtube_v3.Schema$Video> {
        if (!this.auth || !this.youtube || !this.hasAccessToken)
            throw new Error("YouTube client not initialized");

        const videoId = new URL(url).searchParams.get("v");
        if (!videoId)
            throw new Error("Invalid video URL");

        const result = await this.youtube.videos.list({
            auth: this.auth,
            part: ["snippet", "status"],
            id: [videoId],
        });

        const video = result.data.items?.[0];
        if (!video)
            throw new Error("Video not found");

        return video;
    }

    async updateDescription(video: youtube_v3.Schema$Video, description: string): Promise<void> {
        if (!this.auth || !this.youtube || !this.hasAccessToken)
            throw new Error("YouTube client not initialized");

        if (!video.snippet)
            throw new Error("Video does not have a snippet");

        await this.youtube.videos.update({
            auth: this.auth,
            part: ["snippet"],
            requestBody: {
                id: video.id!,
                snippet: {
                    ...video.snippet,
                    description,
                },
            },
        });
    }

    async statusChange(url: string, privacyStatus: "public" | "private"): Promise<void> {
        if (!this.auth || !this.youtube || !this.hasAccessToken)
            throw new Error("YouTube client not initialized");

        const videoId = new URL(url).searchParams.get("v");
        if (!videoId)
            throw new Error("Invalid video URL");

        await this.youtube.videos.update({
            auth: this.auth,
            part: ["status"],
            requestBody: {
                id: videoId,
                status: { privacyStatus },
            },
        });
    }
}

const youtubeClient = new YoutubeClient();

let initializationPromise: Promise<boolean | undefined> | undefined;

export function ensureYoutubeClient(): Promise<boolean | undefined> {
    if (!initializationPromise)
        initializationPromise = youtubeClient.initialize();

    return initializationPromise;
}

export default youtubeClient;
