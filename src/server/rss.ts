// Totally not GPT generated cuz i cba to write this myself

/**
 * Possible feed types.
 * Feel free to adjust or rename as needed.
 */
export const FEED_TYPE = [
    'bsky',
    'statuscafe',
    'soundcloud',
    'youtube',
    'twitch',
    'lastfm',
    'rym',
    'bearblog',
    'tumblr',
    'github',
    'mastodon',
    'twitter',
    'other'
] as const;
export type FeedType = typeof FEED_TYPE[number];

/**
 * A small helper that attempts to determine the "type" of an RSS feed
 * based on the URL domain/path. You can expand this to handle more sites
 * or logic (e.g., multiple Mastodon servers, alternative YouTube frontends, etc.).
 */
export function detectFeedType(urlString: string): FeedType {
    // Safely parse the URL
    let parsed: URL;
    try {
        parsed = new URL(urlString);
    } catch {
        // Not a valid URL at all, treat as custom or fallback
        return 'other';
    }

    const host = parsed.hostname.toLowerCase();
    if (host.includes('bsky'))
        return 'bsky';
    else if (host.includes('status.cafe'))
        return 'statuscafe';
    else if (host.includes('soundcloud'))
        return 'soundcloud';
    else if (host.includes('youtube'))
        return 'youtube';
    else if (host.includes('twitchrss'))
        return 'twitch';
    else if (host.includes('xiffy.nl'))
        // e.g. https://lfm.xiffy.nl/VINXIS
        return 'lastfm';
    else if (host.includes('rateyourmusic'))
        return 'rym';
    else if (host.includes('bearblog'))
        return 'bearblog';
    else if (host.includes('tumblr'))
        return 'tumblr';
    else if (host.includes('github'))
        return 'github';
    else if (host.includes('mastodon'))
        // More robust approach might check for any "mastodon." or a known
        // set of Mastodon domains. For now, just matching the example:
        return 'mastodon';
    else if (host.includes('nitter') || host.includes('lightbrd'))
        // e.g. nitter.privacydev.net
        // It's actually a third-party front-end.
        return 'twitter';

    // Fallback to custom (i.e. user’s personal site or unknown feed)
    return 'other';
}

export function removeTitleDescriptionDuplicates(
    title: string,
    description: string,
    actionType: FeedType,
): string {
    if (!title || !description) return title;

    if (actionType === "statuscafe") {
        const titleWords = title.split(/\s+/);
        const descWords = new Set(description.split(/\s+/));

        // Filter out words in title that also appear in description
        const filtered = titleWords.filter((word) => !descWords.has(word));

        // The end may be truncated
        return filtered.join(" ").replace(/\S*\.\.\.$/, "");
    }

    if (title.includes(description))
        return title.replace(description, "").trim();

    return title;
}

export function linkChanger(url: string, actionType: FeedType) {
    if (actionType === "twitter")
        try {
            const urlObj = new URL(url);
            return `https://twitter.com${urlObj.pathname}`;
        } catch (e) {
            return url;
        }

    return url;
}