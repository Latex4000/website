import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { notInArray, sql } from "drizzle-orm";
import db from "../database/db";
import { Tunicwild } from "../database/schema";

if (!process.env.TUNICWILDS_DAILY_FILE) {
    console.error("TUNICWILDS_DAILY_FILE not set");
    process.exit(1);
}

if (!process.env.TUNICWILDS_RENDERED_DIRECTORY) {
    console.error("TUNICWILDS_RENDERED_DIRECTORY not set");
    process.exit(1);
}

if (!process.env.TUNICWILDS_UPLOAD_URL && !process.env.TUNICWILDS_UPLOAD_DIRECTORY) {
    console.error("TUNICWILDS_UPLOAD_* not set");
    process.exit(1);
}

interface DailyInfo {
    active: {
        audioFilenames: string[];
        date: string;
        id: number;
    }[];
    recentIds: number[];
    startDate: string;
}

const audioLengths = [0.5, 1, 2, 4, 8, 16] as const;

async function renderAudio(id: number): Promise<string[]> {
    let audioBuffer: NodeJS.ArrayBufferView;
    if (process.env.TUNICWILDS_UPLOAD_URL) {
        const response = await fetch(`${process.env.TUNICWILDS_UPLOAD_URL}/${id}`);
        audioBuffer = await response.bytes();
    } else if (process.env.TUNICWILDS_UPLOAD_DIRECTORY) {
        audioBuffer = await readFile(join(process.env.TUNICWILDS_UPLOAD_DIRECTORY, id.toString()));
    } else {
        throw new Error();
    }

    const durationSeconds = Number.parseFloat(execFileSync("ffprobe", [
        "-v", "quiet",
        "-show_entries", "format=duration",
        "-output_format", "csv=p=0",
        "pipe:",
    ], {
        encoding: "utf8",
        input: audioBuffer,
        stdio: ["pipe", "pipe", "ignore"],
    }));

    const filenames = audioLengths.map(() => `${randomBytes(16).toString("hex")}.mp3`);
    const maxAudioLength = audioLengths[audioLengths.length - 1]!;
    const maxAudioLengthFilename = filenames[audioLengths.length - 1]!;

    execFileSync("ffmpeg", [
        "-v", "quiet",
        "-ss", Math.max(0, Math.floor((durationSeconds - maxAudioLength) * Math.random())).toString(),
        "-t", maxAudioLength.toString(),
        "-i", "pipe:",
        "-map", "0:a:0",
        "-map_metadata", "-1",
        join(process.env.TUNICWILDS_RENDERED_DIRECTORY!, maxAudioLengthFilename),
    ], {
        input: audioBuffer,
        stdio: ["pipe", "ignore", "ignore"],
    });

    for (let i = 0; i < audioLengths.length - 1; i++) {
        execFileSync("ffmpeg", [
            "-v", "quiet",
            "-t", audioLengths[i]!.toString(),
            "-i", join(process.env.TUNICWILDS_RENDERED_DIRECTORY!, maxAudioLengthFilename),
            "-c", "copy",
            join(process.env.TUNICWILDS_RENDERED_DIRECTORY!, filenames[i]!),
        ], {
            stdio: "ignore",
        });
    }

    if (process.env.TUNICWILDS_RUN_AFTER_RENDER) {
        execFileSync(
            process.env.TUNICWILDS_RUN_AFTER_RENDER,
            filenames.map(
                (filename) => join(process.env.TUNICWILDS_RENDERED_DIRECTORY!, filename),
            ),
            { stdio: "ignore" },
        );
    }

    return filenames;
}

// From "dist/server/bin/"
process.chdir(resolve(import.meta.dirname, "../../.."));

let dailyInfo: DailyInfo;
try {
    dailyInfo = JSON.parse(await readFile(process.env.TUNICWILDS_DAILY_FILE, "utf8"));
} catch {
    dailyInfo = {
        active: [],
        recentIds: [],
        startDate: new Date().toISOString().slice(0, 10),
    };
}

if (dailyInfo.active.length === 0) {
    const tunicwilds = await db
        .select()
        .from(Tunicwild)
        .orderBy(sql`RANDOM()`)
        .limit(3);

    if (tunicwilds.length !== 3) {
        console.error("Not enough Tunicwilds in database");
        process.exit(1);
    }

    for (let i = 0; i < tunicwilds.length; i++) {
        dailyInfo.active.push({
            audioFilenames: await renderAudio(tunicwilds[i]!.id),
            date: new Date(Date.now() + (i - 1) * 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
            id: tunicwilds[i]!.id,
        });
        dailyInfo.recentIds.push(tunicwilds[i]!.id);
    }
} else {
    const tunicwild = await db
        .select()
        .from(Tunicwild)
        .where(notInArray(Tunicwild.id, dailyInfo.recentIds))
        .orderBy(sql`RANDOM()`)
        .get();

    if (tunicwild == null) {
        console.error("Not enough Tunicwilds in database");
        process.exit(1);
    }

    dailyInfo.active.push({
        audioFilenames: await renderAudio(tunicwild.id),
        date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().slice(0, 10),
        id: tunicwild.id,
    });
    dailyInfo.recentIds.push(tunicwild.id);

    if (dailyInfo.active.length > 3) {
        const dropped = dailyInfo.active.shift()!;

        await Promise.all(dropped.audioFilenames.map(
            (filename) => unlink(join(process.env.TUNICWILDS_RENDERED_DIRECTORY!, filename)),
        ));
    }

    if (dailyInfo.recentIds.length > 30) {
        dailyInfo.recentIds.shift();
    }
}

await writeFile(process.env.TUNICWILDS_DAILY_FILE, JSON.stringify(dailyInfo));
