import { join } from "node:path";
import { extname } from "node:path";
import { checkVideoForYoutube } from "../media/video";
import { withWorkDir, writeBlobToFile } from "../utils/tempFiles";
import youtubeClient, { ensureYoutubeClient } from "../clients/youtube";
import { canUseYoutube } from "../config";

const validExtensions = [".mp4", ".mov", ".mkv", ".avi", ".wmv"];

export interface MotionSubmissionInput {
    title: string;
    description: string;
    tags: string[];
    hideColour: boolean;
    allowYoutubeShorts: boolean;
    confirmInformation: boolean;
    confirmOwnWork: boolean;
    video: File;
    thumbnail?: File | null;
}

export interface MotionSubmissionResult {
    youtubeUrl: string;
}

export async function processMotionSubmission(input: MotionSubmissionInput): Promise<MotionSubmissionResult> {
    if (!canUseYoutube)
        throw new Error("YouTube integration is not configured");

    if (!input.confirmInformation || !input.confirmOwnWork)
        throw new Error("Submission confirmations missing");

    const videoExt = extname(input.video.name).toLowerCase();
    if (!validExtensions.includes(videoExt))
        throw new Error("Video file must be mp4/mov/mkv/avi/wmv");

    if (input.thumbnail) {
        const thumbExt = extname(input.thumbnail.name).toLowerCase();
        if (thumbExt !== ".png" && thumbExt !== ".jpg" && thumbExt !== ".jpeg")
            throw new Error("Thumbnail must be png or jpg");
    }

    return withWorkDir("motion", async (workDir) => {
        const videoPath = join(workDir, `video${videoExt}`);
        await writeBlobToFile(videoPath, input.video);

        const errors = await checkVideoForYoutube(videoPath, {
            allowYoutubeShorts: input.allowYoutubeShorts,
            requireAudio: false,
        });
        if (errors.length > 0)
            throw new Error(errors.join("\n"));

        let thumbnailPath: string | undefined;
        if (input.thumbnail) {
            const thumbExt = extname(input.thumbnail.name).toLowerCase() === ".jpeg" ? ".jpg" : extname(input.thumbnail.name).toLowerCase();
            thumbnailPath = join(workDir, `thumbnail${thumbExt}`);
            await writeBlobToFile(thumbnailPath, input.thumbnail);
        }

        await ensureYoutubeClient();
        const ytData = await youtubeClient.upload(
            input.title,
            `${input.description ?? ""}\n\nTags: ${input.tags.join(", ")}`,
            input.tags,
            videoPath,
            "motions",
            thumbnailPath,
        );

        if (!ytData.status || ytData.status.uploadStatus !== "uploaded")
            throw new Error("Failed to upload motion to YouTube");

        return {
            youtubeUrl: `https://www.youtube.com/watch?v=${ytData.id}`,
        };
    });
}
