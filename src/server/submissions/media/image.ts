import { exec } from "node:child_process";

export type ImageAspectResult = {
    isHorizontal: boolean;
    width: number;
    height: number;
};

export function checkImageAspectRatio(imagePath: string): Promise<ImageAspectResult> {
    return new Promise((resolve, reject) => {
        exec(
            `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${imagePath}"`,
            (err, stdout) => {
                if (err) {
                    reject(err);
                    return;
                }

                const [widthString, heightString] = stdout.trim().split("x");
                if (!widthString || !heightString) {
                    reject(new Error("Invalid image dimensions"));
                    return;
                }

                const width = Number.parseFloat(widthString);
                const height = Number.parseFloat(heightString);

                if (!Number.isFinite(width) || !Number.isFinite(height)) {
                    reject(new Error("Invalid image dimensions"));
                    return;
                }

                resolve({
                    isHorizontal: width / height > 1,
                    width,
                    height,
                });
            },
        );
    });
}
