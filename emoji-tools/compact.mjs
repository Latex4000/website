import { createWriteStream } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { finished } from "node:stream/promises";

const version = "1";
const emojiDirectory = "emoji-tools/emoji";
const gifOutPath = `public/emoji/gif.${version}.bin`;
const mapOutPath = `public/emoji/map.${version}.json`;
const pngOutPath = `public/emoji/png.${version}.bin`;

const emojiFilenames = await readdir(emojiDirectory);

const gifWriteStream = createWriteStream(gifOutPath);
const pngWriteStream = createWriteStream(pngOutPath);
const map = {};

let gifPosition = 0;
let pngPosition = 0;

for (const emojiFilename of emojiFilenames) {
	if (!emojiFilename.endsWith(".gif") && !emojiFilename.endsWith(".png")) {
		throw new Error("Invalid emoji");
	}

	const emoji = await readFile(`${emojiDirectory}/${emojiFilename}`);
	const emojiName = emojiFilename.slice(0, -4);
	const isGif = emojiFilename.endsWith(".gif");

	if (isGif) {
		const startPosition = gifPosition;

		gifPosition += emoji.byteLength;
		gifWriteStream.write(emoji);

		map[emojiName] = [1, startPosition, gifPosition];
	} else {
		const startPosition = pngPosition;

		pngPosition += emoji.byteLength;
		pngWriteStream.write(emoji);

		map[emojiName] = [0, startPosition, pngPosition];
	}
}

gifWriteStream.end();
pngWriteStream.end();

await writeFile(mapOutPath, JSON.stringify(map));

await finished(gifWriteStream);
await finished(pngWriteStream);
