import { createWriteStream, ReadStream, type PathLike } from "fs";
import { finished } from "stream/promises";

export function writeWebFile(path: PathLike, file: File): Promise<void> {
	return finished(
		ReadStream.fromWeb(file.stream()).pipe(createWriteStream(path)),
	);
}
