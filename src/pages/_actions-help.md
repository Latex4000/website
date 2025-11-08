---
title: "Actions Help"
description: "Help and documentation for using actions in LaTeX4000."
---
# Adding an "Action"

So basically actions is just a way to link all your shit.

If your shit has an RSS feed as well though, then you can also have it show posts/feed

This page explains how to add an RSS action to the site for anyone in the collective.

## Finding RSS Feeds

Highly suggest trying these tools to see if the service you are using has 1:
- **[RSShub](https://docs.rsshub.app/guide/)** - Generates RSS feeds for many popular platforms
- **[ALL-about-RSS](https://github.com/AboutRSS/ALL-about-RSS)** - Comprehensive directory of RSS tools and resources

### Supported Common Platforms

#### Bluesky
```
**Format:** `https://bsky.app/profile/[YOURBSKYHANDLE]/rss`
**Example:** `https://bsky.app/profile/sammi.sh/rss`
```

#### Tumblr
```
**Format:** `https://[TUMBLRUSERNAME].tumblr.com/rss`
**Example:** `https://sammish.tumblr.com/rss`
```

#### YouTube
You'll need your channel ID (not your username). You can find this in your channel's URL or in YouTube Studio.
```
**Format:** `https://youtube.com/feeds/videos.xml?channel_id=[YOURYOUTUBECHANNELID]`
**Example:** `https://youtube.com/feeds/videos.xml?channel_id=UCXZO4mFBhtZhQab6H-ktexQ`
```

#### SoundCloud
You'll need your numeric SoundCloud user ID, which can be found by Right clicking your profile on SoundCloud -> View Page Source and ctrl+f for "soundcloud:users:" in the code.
```
**Format:** `https://feeds.soundcloud.com/users/soundcloud:users:[SOUNDCLOUDID]/sounds.rss`
**Example:** `https://feeds.soundcloud.com/users/soundcloud:users:1465894227/sounds.rss`
```

#### MyAnimeList
MAL provides multiple options actually. Check your profile page for different feed types, the example below is for "Recently Watched".
```
**Format:** `https://myanimelist.net/rss.php?type=rw&u=[MALUSERNAME]`
**Example:** `https://myanimelist.net/rss.php?type=rw&u=vinxis1`
```

#### RateYourMusic
There's an RSS button on your RYM profile that you can just click and it'll give you the URL.
```
**Format:** `https://rateyourmusic.com/~[RYMUSERNAME]/data/rss`
**Example:** `https://rateyourmusic.com/~VINXIS/data/rss`
```

#### Your Own Website / Other Blogging Platforms
Most blogging platforms and static site generators automatically create RSS or Atom feeds.
Common locations are `/rss.xml`, `/atom.xml`, or `/feed.xml`.
```
**Format:** `https://[YOURDOMAIN]/rss.xml` or `https://[YOURDOMAIN]/atom.xml`
**Example:** `https://nonacademic.net/rss.xml`
```

#### Bear Blog
Bearblog gives you an rss feed for your blog at `/feed/`.
```
**Format:** `https://[BEARBLOGUSERNAME].bearblog.dev/feed/`
**Example:** `https://vinxis.bearblog.dev/feed/`
```

### Unsupported / Unofficial Platforms

#### Last.fm
This third-party service generates RSS feeds from Last.fm profiles.
```
**Format:** `https://lfm.xiffy.nl/[LASTFMUSERNAME]`
**Example:** `https://lfm.xiffy.nl/VINXIS`
```

#### Twitch
This uses a third-party service to generate RSS feeds for Twitch VODs.
```
**Format:** `https://twitchrss.appspot.com/vod/[CHANNELNAME]`
**Example:** `https://twitchrss.appspot.com/vod/corsace`
```

#### Twitter / X
Twitter doesn't give any service themselves but stuff like Nitter can provide RSS feeds.
```
**Format:** `http://nitter.privacydev.net/[YOURTWITTERHANDLE]/rss`
**Example:** `http://nitter.privacydev.net/deetz/rss`
```

**Note:** These instances are unreliable as shit and sometimes go down often and also slow as hell. Check the [Nitter instances list](https://github.com/zedeus/nitter/wiki/Instances) to pick your poison

#### Instagram
Idk instagram fucking sucks and has no RSS features

## Adding Your Feeds

After you got your RSS feed, go to the discord server and run the `/action` command:
- The `link` param should be the RSS feed (e.g. `https://bsky.app/profile/sammi.sh/rss`)
- The `is_rss` param should be set to `true`
- Put whatever you want for `title` or `description`