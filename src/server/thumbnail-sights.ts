import type { InferSelectModel } from "drizzle-orm";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { ResizeOptions, Sharp } from "sharp";
import sharp from "sharp";
import type { Sight } from "../database/schema";

export async function getSightThumbnailSharp(image: File): Promise<[Sharp, "gif" | "jpeg" | "png"]> {
    const sharpInstance = sharp(await image.arrayBuffer(), { animated: true });
    let format: "gif" | "jpeg" | "png";

    const metadata = await sharpInstance.metadata();
    const stats = await sharpInstance.stats();

    // - If the image is animated, use GIF
    // - If the image is opaque, use JPEG
    // - Otherwise, use PNG
    if ((metadata.pages ?? 1) > 1) {
        format = "gif";
    } else if (stats.isOpaque) {
        format = "jpeg";
    } else {
        format = "png";
    }

    return [sharpInstance, format];
}

export async function thumbnailSight(
    sight: Pick<InferSelectModel<typeof Sight>, "pixelated">,
    sightDirectory: string,
    image: File,
    sharpInstance: Sharp,
    sharpFormat: "gif" | "jpeg" | "png",
): Promise<void> {
    const resizeOptions: ResizeOptions = {
        fit: "inside",
        kernel: sight.pixelated ? "nearest" : undefined,
        withoutEnlargement: true,
    };
    const lowQualitySharpInstance = sharpInstance.clone();

    sharpInstance.resize(400, 300, resizeOptions);

    switch (sharpFormat) {
        case "gif":
            sharpInstance.gif();
            lowQualitySharpInstance.gif({ colours: 4 }).resize(200, 200, resizeOptions);
            break;
        case "jpeg":
            sharpInstance.jpeg();
            lowQualitySharpInstance.jpeg({ quality: 5 }).resize(200, 200, resizeOptions);
            break;
        case "png":
            sharpInstance.png();
            lowQualitySharpInstance.png({ quality: 1 }).resize(100, 100, resizeOptions);
            break;
    }

    const thumbnailDirectory = join(sightDirectory, "thumbs");
    const lowQualityThumbnailDirectory = join(sightDirectory, "thumbs-evil");

    await mkdir(thumbnailDirectory, { recursive: true });
    await mkdir(lowQualityThumbnailDirectory, { recursive: true });

    const filename = `${image.name.replace(/\.[^.]+$/, "")}.${sharpFormat}`;

    await sharpInstance.toFile(join(thumbnailDirectory, filename));
    await lowQualitySharpInstance.toFile(join(lowQualityThumbnailDirectory, filename));
}
