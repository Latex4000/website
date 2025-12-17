import { resolve } from "node:path";

export const submissionConfig = {
    tmpDir: process.env.SUBMISSION_TMP_DIRECTORY
        ? resolve(process.env.SUBMISSION_TMP_DIRECTORY)
        : resolve(process.cwd(), ".tmp"),
    siteUrl: process.env.SITE_URL ?? "http://localhost:4321",
    botBaseUrl: process.env.SUBMISSION_BOT_BASE_URL ?? "http://localhost:5556",
    botHmacKey: process.env.SECRET_HMAC_KEY ?? null,
};