import { eq } from "drizzle-orm";
import { execFileSync } from "node:child_process";
import { openAsBlob } from "node:fs";
import { mkdir, readdir, rename } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Sharp } from "sharp";
import db from "../database/db";
import { Sight } from "../database/schema";
import { getSightThumbnailSharp, thumbnailSight } from "../server/thumbnail-sights";

if (!process.env.SIGHTS_UPLOAD_DIRECTORY) {
    console.error("SIGHTS_UPLOAD_DIRECTORY not set");
    process.exit(1);
}

process.chdir(resolve(import.meta.dirname, "../.."));

for (const id of process.argv.slice(2)) {
    console.error(`Processing sight #${id}`);
    await reprocessSight(Number(id));
}

async function reprocessSight(id: number) {
    const sight = await db
        .select()
        .from(Sight)
        .where(eq(Sight.id, id))
        .get();

    if (sight == null) {
        console.error("Sight not found");
        return;
    }

    const directory = `${process.env.SIGHTS_UPLOAD_DIRECTORY}/${sight.id}`;
    const dirents = await readdir(directory, { withFileTypes: true });

    if (
        dirents.length === 3 &&
        dirents.some((dirent) => dirent.isDirectory() && dirent.name === "original") &&
        dirents.some((dirent) => dirent.isDirectory() && dirent.name === "thumbs") &&
        dirents.some((dirent) => dirent.isDirectory() && dirent.name === "thumbs-evil")
    ) {
        console.error("Sight already has latest thumbnail format");
        return;
    }

    if (dirents.some((dirent) => !dirent.isFile())) {
        console.error("Sight directory contains non-file entries");
        return;
    }

    const filesWithInfo: [File, Sharp, "gif" | "jpeg" | "png"][] = [];

    for (const dirent of dirents) {
        const file = new File([await openAsBlob(join(directory, dirent.name))], dirent.name);

        try {
            filesWithInfo.push([file, ...await getSightThumbnailSharp(file)]);
        } catch {
            console.error(`File "${file.name}" in sight directory is not a valid image`)
            return;
        }
    }

    const originalDirectory = `${directory}/original`;

    await mkdir(originalDirectory, { recursive: true });

    for (const [file, sharpInstance, sharpFormat] of filesWithInfo) {
        await rename(join(directory, file.name), join(originalDirectory, file.name));
        await thumbnailSight(sight, directory, file, sharpInstance, sharpFormat);
    }

    if (process.env.SIGHTS_RUN_AFTER_UPLOAD) {
        execFileSync(process.env.SIGHTS_RUN_AFTER_UPLOAD, [directory], {
            stdio: "ignore",
        });
    }
}
