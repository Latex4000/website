import { parseRssFeed } from "../rss";

export interface ActionSubmissionInput {
    link: string;
    isRSS: boolean;
    title?: string | null;
    description?: string | null;
}

export interface ActionSubmissionResult {
    link: string;
    title: string;
    description: string;
    isRSS: boolean;
    feedTitle?: string;
}

export async function processActionSubmission(input: ActionSubmissionInput): Promise<ActionSubmissionResult> {
    if (!URL.canParse(input.link))
        throw new Error("Invalid URL provided");

    let title = input.title?.trim() ?? "";
    let description = input.description?.trim() ?? "";

    if (!input.isRSS) {
        if (!title || !description)
            throw new Error("Title and description are required for non-RSS links");

        return {
            link: input.link,
            title,
            description,
            isRSS: false,
        };
    }

    const feed = await parseRssFeed(input.link);
    if ((!feed.title && !title) || (!feed.description && !description)) {
        throw new Error(
            `RSS/Atom feed missing ${!feed.title && !title ? "title" : "description"}. Provide custom metadata and try again.`,
        );
    }

    if (!title)
        title = feed.title ?? "";
    if (!description)
        description = feed.description ?? "";

    const result: ActionSubmissionResult = {
        link: input.link,
        title,
        description,
        isRSS: true,
    };

    if (feed.title)
        result.feedTitle = feed.title;

    return result;
}
