import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { mkdir, writeFile } from "fs/promises";
import { createWriteStream, ReadStream } from "fs";
import { db, isDbError, Word } from "astro:db";
import { wordFromDb, wordId } from "../../../db/config";
import { type WordType } from "../../../db/types";
import { Marked } from "marked";
import { baseUrl as markedBaseUrl } from "marked-base-url";
import { markedEmoji } from "marked-emoji";
import { execFileSync } from "child_process";
import { finished } from "stream/promises";
import { thingDeletion, thingGet } from "../../server/thingUtils";
import { getMap } from "../../data/emoji";
import { serverHTMLPurify } from "../../components/dompurifyserver";

export const prerender = false;

const fileSizeLimit = 2 ** 20;

export const GET: APIRoute = async (context) => thingGet(context, "words");

export const POST: APIRoute = async (context) => {
    if (!process.env.WORDS_UPLOAD_DIRECTORY) {
        return jsonError("WORDS_UPLOAD_DIRECTORY not set", 500);
    }

    let formData: FormData;
    try {
        formData = await context.request.formData();
    } catch {
        return jsonError("Request body must be form data");
    }

    const discord = formData.get("discord");
    const title = formData.get("title");
    const tags = formData.get("tags") ?? "";
    const md = formData.get("md");
    const assetFiles = formData.getAll("assets") as File[];

    // Form validation
    if (
        typeof discord !== "string" ||
        typeof title !== "string" ||
        typeof tags !== "string" ||
        typeof md !== "string" ||
        assetFiles.some((value) => !(value instanceof File))
    ) {
        return jsonError("Invalid form params");
    }

    if (title.length > 2 ** 10) {
        return jsonError("Title is too long");
    }

    if (tags.length > 2 ** 10) {
        return jsonError("Tags are too long");
    }

    if (md.length > fileSizeLimit) {
        return jsonError("Markdown content is too long");
    }

    // File validation
    for (const file of assetFiles) {
        if (file.size > fileSizeLimit) {
            return jsonError(
                `File "${file.name}" is too large (${file.size / 2 ** 10}KiB > ${fileSizeLimit / 2 ** 10}KiB)`,
            );
        }
    }

    if (
        assetFiles.some(
            (file) => file.name === "words.md" || file.name === "words.html",
        )
    ) {
        return jsonError(
            'Cannot upload asset file named "words.md" or "words.html"',
        );
    }

    // Store to DB
    let word: WordType;
    try {
        word = wordFromDb(
            await db
                .insert(Word)
                .values({
                    memberDiscord: discord,
                    tags:
                        tags.length === 0
                            ? []
                            : tags.split(",").map((tag) => tag.trim()),
                    title,
                })
                .returning()
                .get(),
        );
    } catch (error) {
        if (isDbError(error) && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return jsonError("Word already exists");
        }

        if (isDbError(error) && error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
            return jsonError(
                "Invalid Discord ID; member does not exist; probably needs to join first",
            );
        }

        throw error;
    }

    // Upload files
    const directory = `${process.env.WORDS_UPLOAD_DIRECTORY}/${wordId(word)}`;

    await mkdir(directory);
    await writeFile(`${directory}/words.md`, md, "utf8");

    for (const file of assetFiles) {
        await finished(
            ReadStream.fromWeb(file.stream()).pipe(
                createWriteStream(`${directory}/${file.name}`),
            ),
        );
    }

    // Upload compiled HTML file
    const emojis = Object.fromEntries(Object.keys(await getMap()).map((emojiName) => [emojiName, ""]));
    const emptyGif = "data:image/gif;base64,R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    let html: string;
    try {
        html = await serverHTMLPurify(new Marked(
            markedBaseUrl(
                new URL(`/words-uploads/${wordId(word)}/`, context.url).toString(),
            ),
            markedEmoji({
                emojis,
                renderer: (token) => `<img alt="" src="${emptyGif}" title=":${token.name}:" class="emoji">`,
            }),
        ).parse(md, { async: false, breaks: true, silent: true }), ".word-markdown");
    } catch (e) {
        console.error(e);
        return jsonError("Error compiling Markdown to HTML");
    }

    await writeFile(`${directory}/words.html`, html, "utf8");

    if (process.env.WORDS_RUN_AFTER_UPLOAD) {
        execFileSync(process.env.WORDS_RUN_AFTER_UPLOAD, [directory], {
            stdio: "ignore",
        });
    }

    return jsonResponse(word);
};

export const PUT: APIRoute = async (context) => thingDeletion(context, "words", false);

export const DELETE: APIRoute = async (context) => thingDeletion(context, "words", true);
