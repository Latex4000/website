import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { submissionConfig } from "../config";

async function ensureBaseTmpDir(): Promise<void> {
    await mkdir(submissionConfig.tmpDir, { recursive: true });
}

export async function createWorkDir(prefix: string): Promise<string> {
    await ensureBaseTmpDir();
    const workDir = join(submissionConfig.tmpDir, `${prefix}-${Date.now()}-${randomUUID()}`);
    await mkdir(workDir, { recursive: true });
    return workDir;
}

export async function writeBlobToFile(path: string, blob: Blob): Promise<void> {
    const buffer = Buffer.from(await blob.arrayBuffer());
    await mkdir(dirname(path), { recursive: true }).catch(() => undefined);
    await writeFile(path, buffer);
}

export type DisposableWorkDir<T> = Promise<T> & { dispose: () => Promise<void> };

export async function withWorkDir<T>(
    prefix: string,
    handler: (dir: string) => Promise<T>,
): Promise<T> {
    const dir = await createWorkDir(prefix);
    try {
        return await handler(dir);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}
