import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../../server/responses";
import { mkdir, writeFile } from "fs/promises";
import { createWriteStream, ReadStream } from "fs";
import { db, isDbError, Word } from "astro:db";
import { wordFromDb, wordId, type WordType } from "../../../db/config";
import { Marked } from "marked";
import { baseUrl } from "marked-base-url";
import { execFileSync } from "child_process";
import checkHmac from "../../server/hmac";

export const prerender = false;

const fileSizeLimit = 2 ** 20;

export const POST: APIRoute = async (context) => {
	if (process.env.WORDS_UPLOAD_DIRECTORY == null) {
		return jsonError("Env not set", 500);
	}

	let formData: FormData;
	try {
		formData = await context.request.formData();
	} catch {
		return jsonError("Request body must be form data");
	}

	const discord = formData.get("discord");
	const title = formData.get("title");
	const tags = formData.get("tags");
	const md = formData.get("md");
	const assetFiles = formData.getAll("assets") as File[];

	if (typeof title !== "string" || !checkHmac(context.request, title)) {
		return jsonError("Invalid HMAC", 401);
	}

	// Form validation
	if (
		typeof discord !== 'string' ||
		typeof title !== 'string' ||
		(tags != null && typeof tags !== 'string') ||
		typeof md !== 'string' ||
		assetFiles.some((value) => !(value instanceof File))
	) {
		return jsonError("Invalid form params");
	}

	if (title.length > 2 ** 10) {
		return jsonError("Title is too long");
	}

	if ((tags?.length ?? 0) > 2 ** 10) {
		return jsonError("Tags are too long");
	}

	if (md.length > fileSizeLimit) {
		return jsonError("Markdown content is too long");
	}

	// File validation
	for (const file of assetFiles) {
		if (file.size > fileSizeLimit) {
			return jsonError(`File "${file.name}" is too large (${file.size / 2 ** 10}KiB > ${fileSizeLimit / 2 ** 10}KiB)`);
		}
	}

	if (assetFiles.some((file) => file.name === "words.md" || file.name === "words.html")) {
		return jsonError("Cannot upload asset file named \"words.md\" or \"words.html\"");
	}

	// Store to DB
	let word: WordType;
	try {
		word = wordFromDb(
			await db
				.insert(Word)
				.values({
					memberDiscord: discord,
					tags: tags?.split(',').map((tag) => tag.trim()) ?? [],
					title,
				})
				.returning()
				.get()
		);
	} catch (error) {
		if (isDbError(error) && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
			return jsonError("Word already exists");
		}

		if (isDbError(error) && error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
			return jsonError("Invalid Discord ID");
		}

		throw error;
	}

	// Upload files
	const directory = `${process.env.WORDS_UPLOAD_DIRECTORY}/${wordId(word)}`;

	await mkdir(directory);
	await writeFile(`${directory}/words.md`, md, "utf8");

	for (const file of assetFiles) {
		ReadStream.fromWeb(file.stream())
			.pipe(createWriteStream(`${directory}/${file.name}`));
	}

	// Upload compiled HTML file
	
	const marked = new Marked({ silent: true })
		.use(baseUrl(`https://nonacademic.net/words-raw/${wordId(word)}/`));
	const html = marked.parse(md, { async: false });
	await writeFile(`${directory}/words.html`, html, "utf8");

	if (process.env.WORDS_RUN_AFTER_UPLOAD != null) {
		execFileSync(process.env.WORDS_RUN_AFTER_UPLOAD, [directory], { stdio: "ignore" });
	}

	return jsonResponse(word);
};
