import type { APIRoute } from "astro";
import { jsonError, jsonResponse } from "../server/responses";
import { mkdir, writeFile } from "fs/promises";
import { createWriteStream, ReadStream } from "fs";
import { db, isDbError, Word } from "astro:db";
import type { WordType } from "../../db/config";
import { Marked } from "marked";
import { execFileSync } from "child_process";

export const prerender = false;

const fileSizeLimit = 2 ** 20;
const marked = new Marked({ silent: true });

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

	const slug = formData.get("slug");
	const md = formData.get("words");
	const assetFiles = formData.getAll("assets") as File[];

	if (
		typeof slug !== 'string' ||
		slug.length > 2 ** 8 ||
		!/^[a-z-]+$/.test(slug) ||
		typeof md !== 'string' ||
		md.length > fileSizeLimit ||
		assetFiles.some((value) => !(value instanceof File))
	) {
		return jsonError("Invalid form params");
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
		word = (await db.insert(Word).values({ slug }).returning())[0]!;
	} catch (error) {
		if (isDbError(error) && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
			return jsonError("Word already exists");
		}

		throw error;
	}

	// Upload files
	const directory = `${process.env.WORDS_UPLOAD_DIRECTORY}/${word.slug}`;

	await mkdir(directory);
	await writeFile(`${directory}/words.md`, md, "utf8");

	for (const file of assetFiles) {
		ReadStream.fromWeb(file.stream())
			.pipe(createWriteStream(`${directory}/${file.name}`));
	}

	// Upload compiled HTML file
	const html = marked.parse(md, { async: false });
	await writeFile(`${directory}/words.html`, html, "utf8");

	if (process.env.WORDS_RUN_AFTER_UPLOAD != null) {
		execFileSync(process.env.WORDS_RUN_AFTER_UPLOAD, [directory], { stdio: "ignore" });
	}

	return jsonResponse(word);
};
