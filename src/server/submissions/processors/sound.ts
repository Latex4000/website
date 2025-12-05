import { createHash } from "node:crypto";
import { join, extname } from "node:path";
import { checkVideoForYoutube, renderStillVideoForYoutube } from "../media/video";
import { checkImageAspectRatio } from "../media/image";
import { withWorkDir, writeBlobToFile } from "../utils/tempFiles";
import youtubeClient, { ensureYoutubeClient } from "../clients/youtube";
import { canUseSoundcloud, canUseYoutube, submissionConfig } from "../config";
import { uploadSoundcloud, changeSoundcloudDescription } from "../clients/soundcloud";

const validVideoExtensions = [".mp4", ".mov", ".mkv", ".avi", ".wmv"];

export interface SoundSubmissionInput {
    memberDiscord: string;
    title: string;
    genre: string;
    description: string;
    tags: string[];
    hideColour: boolean;
    allowYoutubeShorts: boolean;
    allowVerticalCover: boolean;
    confirmInformation: boolean;
    confirmOwnWork: boolean;
    audio: File;
    image: File;
    video?: File | null;
}

export interface SoundSubmissionResult {
    youtubeUrl: string | null;
    soundcloudUrl: string | null;
}

async function ensureHorizontalCover(imagePath: string, allowVertical: boolean): Promise<void> {
    const { isHorizontal, width, height } = await checkImageAspectRatio(imagePath);
    if (!isHorizontal && !allowVertical)
        throw new Error(
            `Cover image must be horizontal (received ${width}x${height}). Enable the vertical option to override.`,
        );
}

function hashFilename(name: string): string {
    return createHash("sha256").update(name + Date.now().toString()).digest("hex");
}

async function downloadBlobToPath(blob: File, destination: string): Promise<void> {
    await writeBlobToFile(destination, blob);
}

async function uploadToYoutubeAndSoundcloud(
    params: {
        workDir: string;
        title: string;
        description: string;
        genre: string;
        tags: string[];
        allowYoutubeShorts: boolean;
        audioPath: string;
        imagePath: string;
        videoPath?: string;
        uploadThumbnail: boolean;
    },
): Promise<SoundSubmissionResult> {
    let youtubeUrl = "";
    let soundcloudUrl = "";

    const allTags = [...params.tags];
    if (params.genre)
        allTags.push(params.genre);

    const defaultTags = [
        "music",
        "indie music",
        "unsigned artist",
        "original music",
        "new music",
        "collective music",
        "group music",
        "collective",
        "group",
        "latex 4000",
    ];
    const hashtags = allTags.map((tag) => `#${tag.replace(/\s+/g, "")}`).join(" ");

    let uniqueTags = [...new Set([...allTags, ...defaultTags])].filter((tag) => tag.length > 0);
    while (uniqueTags.join(", ").length > 300) {
        const lastTag = uniqueTags.pop();
        if (lastTag && uniqueTags.join("").length < 200) {
            uniqueTags.push(lastTag);
            break;
        }
    }

    const releaseDate = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const baseDescription = `${params.description.length > 0 ? `${params.description}\n\n` : ""}Genre: ${params.genre}\n${hashtags.length > 0 ? `Tags: ${hashtags}\n` : ""}Released: ${releaseDate}\n\nSite: ${submissionConfig.siteUrl}`;

    if (canUseYoutube) {
        await ensureYoutubeClient();
        const uploadVideoPath = params.videoPath ?? join(params.workDir, `${hashFilename("sound-video")}.mp4`);

        if (!params.videoPath)
            await renderStillVideoForYoutube(params.imagePath, params.audioPath, uploadVideoPath);

        const ytData = await youtubeClient.upload(
            params.title,
            baseDescription,
            uniqueTags,
            uploadVideoPath,
            "sounds",
            params.uploadThumbnail ? params.imagePath : undefined,
        );

        if (!ytData.status || ytData.status.uploadStatus !== "uploaded")
            throw new Error("Failed to upload to YouTube");

        youtubeUrl = `https://www.youtube.com/watch?v=${ytData.id}`;
    }

    const scDescription = `${baseDescription}\nYouTube: ${youtubeUrl}\n\nMusic from LaTeX 4000.\nUse our music however you want, just give credit to the collective`;

    if (canUseSoundcloud)
        soundcloudUrl = await uploadSoundcloud(params.title, scDescription, uniqueTags, params.audioPath, params.imagePath);

    if (canUseYoutube && youtubeUrl && soundcloudUrl)
        await youtubeClient.updateDescription(
            await youtubeClient.getVideo(youtubeUrl),
            `${baseDescription}\nSoundCloud: ${soundcloudUrl}\n\nMusic from LaTeX 4000.\nUse our music however you want, just give credit to the collective`,
        );

    if (soundcloudUrl && !canUseYoutube)
        await changeSoundcloudDescription(soundcloudUrl, scDescription);

    return { youtubeUrl: youtubeUrl || null, soundcloudUrl: soundcloudUrl || null };
}

export async function processSoundSubmission(input: SoundSubmissionInput): Promise<SoundSubmissionResult> {
    if (!input.confirmInformation)
        throw new Error("Information confirmation missing");
    if (!input.confirmOwnWork)
        throw new Error("Own work confirmation missing");

    const audioExt = extname(input.audio.name).toLowerCase();
    if (audioExt !== ".mp3" && audioExt !== ".wav")
        throw new Error("Audio file must be an mp3 or wav");

    const imageExt = extname(input.image.name).toLowerCase();
    if (imageExt !== ".png" && imageExt !== ".jpg" && imageExt !== ".jpeg")
        throw new Error("Cover image must be a png or jpg");

    if (input.video) {
        const videoExt = extname(input.video.name).toLowerCase();
        if (!validVideoExtensions.includes(videoExt))
            throw new Error("Video file must be mp4/mov/mkv/avi/wmv");
    }

    return withWorkDir("sound", async (workDir) => {
        const audioPath = join(workDir, `audio${audioExt}`);
        await downloadBlobToPath(input.audio, audioPath);

        const imagePath = join(workDir, `image${imageExt === ".jpeg" ? ".jpg" : imageExt}`);
        await downloadBlobToPath(input.image, imagePath);
        await ensureHorizontalCover(imagePath, input.allowVerticalCover);

        let videoPath: string | undefined;
        if (input.video) {
            videoPath = join(workDir, `video${extname(input.video.name).toLowerCase()}`);
            await downloadBlobToPath(input.video, videoPath);
            const errors = await checkVideoForYoutube(videoPath, {
                allowYoutubeShorts: input.allowYoutubeShorts,
                requireAudio: false,
            });
            if (errors.length > 0)
                throw new Error(errors.join("\n"));
        }

        const uploadPayload: Parameters<typeof uploadToYoutubeAndSoundcloud>[0] = {
            workDir,
            title: input.title,
            description: input.description,
            genre: input.genre,
            tags: input.tags,
            allowYoutubeShorts: input.allowYoutubeShorts,
            audioPath,
            imagePath,
            uploadThumbnail: true,
        };

        if (videoPath)
            uploadPayload.videoPath = videoPath;

        return uploadToYoutubeAndSoundcloud(uploadPayload);
    });
}
