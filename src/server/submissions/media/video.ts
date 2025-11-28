import { execFile } from "node:child_process";

function execFileAsync(file: string, args: readonly string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        execFile(file, args, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(stdout);
        });
    });
}

interface FfprobeStreamVideo {
    codec_name: string;
    codec_type: "video";
    width: number;
    height: number;
}

interface FfprobeStreamAudio {
    codec_name: string;
    codec_type: "audio";
}

interface FfprobeStreamOther {
    codec_type?: undefined;
}

interface FfprobeOutput {
    format: {
        duration: string;
        format_name: string;
    };
    streams: Array<FfprobeStreamVideo | FfprobeStreamAudio | FfprobeStreamOther>;
}

interface VideoInfo {
    durationSeconds: number;
    formatName: string;
    audioStreams: FfprobeStreamAudio[];
    videoStreams: FfprobeStreamVideo[];
    otherStreamCount: number;
}

async function getVideoInfo(path: string): Promise<VideoInfo> {
    const stdout = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration,format_name:stream=codec_name,codec_type,width,height",
        "-output_format",
        "json",
        path,
    ]);

    const output = JSON.parse(stdout) as FfprobeOutput;
    const videoInfo: VideoInfo = {
        durationSeconds: Number.parseFloat(output.format.duration),
        formatName: output.format.format_name,
        audioStreams: [],
        videoStreams: [],
        otherStreamCount: 0,
    };

    for (const stream of output.streams) {
        switch (stream.codec_type) {
            case "audio":
                videoInfo.audioStreams.push(stream);
                break;
            case "video":
                videoInfo.videoStreams.push(stream);
                break;
            default:
                videoInfo.otherStreamCount++;
                break;
        }
    }

    return videoInfo;
}

export async function checkVideoForYoutube(
    path: string,
    options: { allowYoutubeShorts: boolean; requireAudio: boolean },
): Promise<string[]> {
    const videoInfo = await getVideoInfo(path);
    const errors: string[] = [];

    if (!videoInfo.formatName.split(",").includes("mp4"))
        errors.push("File format must be MP4");

    if (options.requireAudio) {
        if (videoInfo.audioStreams.length !== 1)
            errors.push(`Must have 1 audio stream (found ${videoInfo.audioStreams.length})`);
    } else if (videoInfo.audioStreams.length > 1) {
        errors.push(`Must have 0 or 1 audio streams (found ${videoInfo.audioStreams.length})`);
    }

    const audioStream = videoInfo.audioStreams[0];
    if (audioStream && audioStream.codec_name !== "aac" && audioStream.codec_name !== "mp3")
        errors.push("Audio stream must be AAC or MP3");

    if (videoInfo.videoStreams.length !== 1) {
        errors.push(`Must have 1 video stream (found ${videoInfo.videoStreams.length})`);
    } else if (videoInfo.videoStreams[0]!.codec_name !== "h264") {
        errors.push("Video stream must be H.264/AVC");
    }

    if (videoInfo.otherStreamCount > 0)
        errors.push(`Cannot have streams besides audio and video (found ${videoInfo.otherStreamCount})`);

    if (!options.allowYoutubeShorts) {
        const videoStream = videoInfo.videoStreams[0];
        if (
            videoStream &&
            videoInfo.durationSeconds <= 181 &&
            videoStream.height >= videoStream.width
        ) {
            errors.push(
                "This video would be uploaded as a YouTube Short because it is under 3 minutes and has a square or vertical aspect ratio. " +
                "Note that YouTube fully blocks Shorts that contain copyright material. If you still want to upload as a Short, use the 'allow_youtube_shorts' option",
            );
        }
    }

    return errors;
}

export async function renderStillVideoForYoutube(
    imagePath: string,
    audioPath: string,
    destinationPath: string,
): Promise<void> {
    await execFileAsync("ffmpeg", [
        "-loop",
        "1",
        "-i",
        imagePath,
        "-i",
        audioPath,
        "-vf",
        "scale='min(1920, floor(iw/2)*2)':-2,format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-profile:v",
        "main",
        "-c:a",
        "aac",
        "-shortest",
        "-movflags",
        "+faststart",
        destinationPath,
    ]);
}
