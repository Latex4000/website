import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const userAgentRegexes: RegExp[] = [];

// Load patterns from external crawler list
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

// Load additional patterns from local file
try {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const additionalPatternsPath = join(__dirname, "../data/additional-crawler-patterns.json");
	
	const json = readFileSync(additionalPatternsPath, "utf8");
	const additionalPatterns = JSON.parse(json);

	if (!Array.isArray(additionalPatterns)) {
		throw new Error();
	}

	for (const pattern of additionalPatterns) {
		if (
			typeof pattern !== "object" ||
			typeof pattern?.pattern !== "string"
		) {
			throw new Error();
		}

		userAgentRegexes.push(new RegExp(pattern.pattern, "i"));
	}

	console.log(`Loaded ${userAgentRegexes.length} total crawler patterns (including ${additionalPatterns.length} additional patterns)`);
} catch (error) {
	console.error("Error loading additional crawler patterns file:", error);
}

export default function isCrawlerUserAgent(userAgent: string): boolean {
	return userAgentRegexes.some((regex) => regex.test(userAgent));
}
