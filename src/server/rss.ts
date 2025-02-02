// Totally not GPT generated cuz i cba to write this myself

/**
 * Possible feed types.
 * Feel free to adjust or rename as needed.
 */
export type FeedType =
    | 'bsky'
    | 'statuscafe'
    | 'soundcloud'
    | 'youtube'
    | 'twitch'
    | 'lastfm'
    | 'rym'
    | 'bearblog'
    | 'tumblr'
    | 'github'
    | 'mastodon'
    | 'twitter'
    | 'custom'; // fallback

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
        return 'custom';
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
    else if (host.endsWith('bearblog'))
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
    return 'custom';
}

// /* Example usage */
// const testUrls = [
//     'https://bsky.app/profile/sammi.sh/rss',
//     'https://status.cafe/users/vinxis.atom',
//     'https://nonacademic.net/rss.xml',
//     'https://feeds.soundcloud.com/users/soundcloud:users:1465894227/sounds.rss',
//     'https://youtube.com/feeds/videos.xml?channel_id=UCXZO4mFBhtZhQab6H-ktexQ',
//     'https://twitchrss.com/feeds/?username=vinxis1&feed=channel_updates',
//     'https://lfm.xiffy.nl/VINXIS',
//     'https://rateyourmusic.com/~VINXIS/data/rss',
//     'https://vinxis.bearblog.dev/feed/',
//     'https://sammish.tumblr.com/rss',
//     'https://github.com/VINXIS.atom',
//     'https://mastodon.social/users/nixCraft.rss',
//     'https://nitter.privacydev.net/corsace_/rss'
// ];

// for (const url of testUrls) {
//     console.log(url, '=>', detectFeedType(url));
// }
