import { JsonResponseError } from "./responses";

export async function getFileOrDiscordAttachment(param: FormDataEntryValue | null, optional?: false, responseErrorType?: typeof JsonResponseError): Promise<File>;
export async function getFileOrDiscordAttachment(param: FormDataEntryValue | null, optional: true, responseErrorType?: typeof JsonResponseError): Promise<File | null>;
export async function getFileOrDiscordAttachment(param: FormDataEntryValue | null, optional?: boolean, responseErrorType = JsonResponseError): Promise<File | null> {
	if (param == null) {
		if (optional) {
			return null;
		}

		throw new responseErrorType("Invalid file or Discord attachment");
	}

	if (param instanceof File) {
		return param;
	}

	let url: URL;
	try {
		url = new URL(param);
	} catch {
		throw new responseErrorType("Invalid Discord attachment URL");
	}

	if (
		url.hostname !== "cdn.discordapp.com" ||
		!url.pathname.includes(".")
	) {
		throw new responseErrorType("Invalid Discord attachment URL");
	}

	const response = await fetch(param).catch(() => null);

	if (
		response?.body == null ||
		response.headers.get("Content-Disposition") !== "attachment" ||
		response.status !== 200
	) {
		throw new responseErrorType("Failed to fetch Discord attachment", 500);
	}

	return new File([await response.blob()], url.pathname.slice(url.pathname.lastIndexOf("/") + 1));
}

export function getTags(param: string | null): string[] {
	return !param?.length
  	? []
    : param.split(",").map((tag) => tag.trim());
}
