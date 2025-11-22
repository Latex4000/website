import AdmZip from "adm-zip";

const fileSizeLimit = 2 ** 20;

export interface WordAssetsResult {
    files: File[];
}

export async function extractWordAssets(zipFile?: File | null): Promise<WordAssetsResult> {
    if (!zipFile)
        return { files: [] };

    const buffer = Buffer.from(await zipFile.arrayBuffer());
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    if (!entries.length)
        throw new Error("No assets found in the zip file");

    const files: File[] = [];
    for (const entry of entries) {
        if (entry.isDirectory)
            throw new Error("Zip file cannot contain directories. Please flatten assets");

        const file = entry.getData();

        if (file.length > fileSizeLimit)
            throw new Error(`File "${entry.entryName}" exceeds the 1 MiB limit`);

        files.push(new File([new Uint8Array(file)], entry.entryName));
    }

    return { files };
}
