import AdmZip from "adm-zip";
import { dirname, join } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";

export async function extractZipBuffer(buffer: ArrayBuffer, destination: string): Promise<string[]> {
    const zip = new AdmZip(Buffer.from(buffer));
    const entries = zip.getEntries();
    const extractedFiles: string[] = [];

    for (const entry of entries) {
        if (entry.isDirectory)
            throw new Error("Zip file cannot contain directories. Please flatten files before uploading.");

        const filePath = join(destination, entry.entryName);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, entry.getData());
        extractedFiles.push(filePath);
    }

    if (extractedFiles.length === 0)
        throw new Error("No files found inside zip");

    return extractedFiles;
}
