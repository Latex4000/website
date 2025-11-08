import { readFileSync } from "node:fs";

const userAgentRegexes: RegExp[] = [];

try {
	if (!process.env.CRAWLER_UA_JSON) {
		throw new Error();
	}

	const json = readFileSync(process.env.CRAWLER_UA_JSON, "utf8");
	const userAgents = JSON.parse(json);

	if (!Array.isArray(userAgents)) {
		throw new Error();
	}

	for (const userAgent of userAgents) {
		if (
			typeof userAgent !== "object" ||
			typeof userAgent?.pattern !== "string"
		) {
			throw new Error();
		}

		userAgentRegexes.push(new RegExp(userAgent.pattern));
	}
} catch {
	console.error("Error loading crawler user agents file");
}

export default function isCrawlerUserAgent(userAgent: string): boolean {
	return userAgentRegexes.some((regex) => regex.test(userAgent));
}
