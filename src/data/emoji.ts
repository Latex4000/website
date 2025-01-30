type EmojiMap = Record<string, [0 | 1, number, number]>;

const version = "1";
const gifPath = `/emoji/gif.${version}.bin`;
const mapPath = `/emoji/map.${version}.json`;
const pngPath = `/emoji/png.${version}.bin`;

let _gif: ArrayBuffer;
let _map: EmojiMap;
let _png: ArrayBuffer;

async function getGif(): Promise<ArrayBuffer> {
    return (_gif ??= await fetch(gifPath).then((response) =>
        response.arrayBuffer(),
    ));
}

export async function getMap(): Promise<EmojiMap> {
    if (_map != null) {
        return _map;
    }

    if (import.meta.env.SSR) {
        const { readFile } = await import("node:fs/promises");

        return _map = await readFile(process.env.PUBLIC_DIRECTORY + mapPath, "utf8")
            .then((file) => JSON.parse(file))
            .catch(() => ({}));
    }

    return _map = await fetch(mapPath)
        .then((response) => response.json())
        .catch(() => ({}));
}

async function getPng(): Promise<ArrayBuffer> {
    return (_png ??= await fetch(pngPath).then((response) =>
        response.arrayBuffer(),
    ));
}

export async function getDataUrl(emojiName: string): Promise<string> {
    if (import.meta.env.SSR) {
        throw new Error("Client only");
    }

    const [isGif, start, end] = (await getMap())[emojiName]!;

    const buffer = await (isGif ? getGif : getPng)();
    const mimeType = isGif ? "image/gif" : "image/png";

    return new Promise((resolve) => {
        const fileReader = new FileReader();

        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.readAsDataURL(new Blob([buffer.slice(start, end)], { type: mimeType }));
    });
}
