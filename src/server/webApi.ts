import { createWriteStream, ReadStream, type PathLike } from "fs";
import { finished } from "stream/promises";

export function writeBlobToFile(path: PathLike, blob: Blob): Promise<void> {
	return finished(
		ReadStream.fromWeb(blob.stream()).pipe(createWriteStream(path)),
	);
}
