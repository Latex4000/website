import AdmZip from "adm-zip";

export interface SightAssetsResult {
    files: File[];
}

export async function expandSightAssets(uploads: File[]): Promise<SightAssetsResult> {
    const files: File[] = [];

    for (const upload of uploads) {
        if (upload.name.toLowerCase().endsWith(".zip")) {
            const buffer = Buffer.from(await upload.arrayBuffer());
            const zip = new AdmZip(buffer);
            const entries = zip.getEntries();

            for (const entry of entries) {
                if (entry.isDirectory)
                    throw new Error("Zip files cannot contain directories");

                files.push(new File([entry.getData()], entry.entryName));
            }

            if (!entries.length)
                throw new Error("Zip file contained no assets");
        } else {
            files.push(upload);
        }
    }

    if (!files.length)
        throw new Error("No images provided");

    return { files };
}
