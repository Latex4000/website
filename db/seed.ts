import { db, Member, Sound } from "astro:db";

// https://astro.build/db/seed
export default async function seed() {
    await db.insert(Member).values([
        {
            discord: "352605625869402123",
            alias: "VINXIS",
            site: "https://vinxis.moe/",
            addedRingToSite: true,
            color: "#aaaaaa",
        },
        {
            discord: "93076479650332672",
            alias: "nyquill",
            site: "https://nyquill.moe/",
            addedRingToSite: false,
            color: "#bbbbbb",
        },
        {
            discord: "94635842785521664",
            alias: "cl8n",
            site: "https://clayton.cc/",
            addedRingToSite: true,
            color: "#cccccc",
        },
        {
            discord: "126885302185885697",
            alias: "sammish",
            site: "https://sammi.sh/",
            addedRingToSite: true,
            color: "#dddddd",
        },
        {
            discord: "122019342769455105",
            alias: "uberzolik",
            site: "https://uwuzolik.neocities.org/",
            addedRingToSite: true,
            color: "#eeeeee",
        },
        {
            discord: "92448752152875008",
            alias: "uzzi",
            site: "https://uzzi.ca/",
            addedRingToSite: true,
            color: "#ffffff",
        },
        {
            discord: "211350311246233600",
            alias: "invoker",
            site: "https://invoqwer.ca/projects",
            addedRingToSite: true,
            color: "#999999",
        },
        {
            discord: "92671864312176640",
            alias: "diodex",
            site: "https://www.diodex.moe/",
            addedRingToSite: true,
            color: "#888888",
        },
        {
            discord: "304444747068604416",
            alias: "kambojk",
            site: "https://kambojk.lol/",
            addedRingToSite: true,
            color: "#777777",
        },
    ]);

    await db.insert(Sound).values([
        {
            title: "Born In An Underground River... Gg",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=gzMRgTtMkQY",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/born-in-an-underground-river",
            date: new Date("2025-01-12T05:36:33.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "my soul your beat (off)",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=KAxIejR6k94",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/my-soul-your-beat-off",
            date: new Date("2025-01-13T00:06:51.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "had a schizo moment from hearing megalovania",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=S1lMku7VBdM",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/had-a-schizo-moment-from",
            date: new Date("2025-01-13T19:23:38.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "camera angel blues",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=KhbtiN1rdow",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/camera-angel-blues",
            date: new Date("2025-01-13T19:55:53.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "hayley williams crashes out in new jersey (LilB type beat)",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=KWfnWe1DVv4",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/hayley-williams-crashes-out-in",
            date: new Date("2025-01-13T20:27:41.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "Elect Yo Floop",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=Hk4AVZMfGfo",
            soundcloudUrl: "https://soundcloud.com/latex4000/elect-yo-floop",
            date: new Date("2025-01-17T04:26:45.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "astrobot_ost_14_REMIX",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=UkRmIKQzUL8",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/astrobot_ost_14_remix",
            date: new Date("2025-01-17T06:30:55.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "Person of Interest (2003) Title Theme",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=UMuu8vRH_6Y",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/person-of-interest-2003-title",
            date: new Date("2025-01-17T06:31:46.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "monkey",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=hqPXlrOIC0s",
            soundcloudUrl: "https://soundcloud.com/latex4000/monkey",
            date: new Date("2025-01-17T06:37:46.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "Drake Sampled sonic the hedgehog to make this song....",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=V2oSHweiRgI",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/drake-sampled-sonic-the",
            date: new Date("2025-01-17T06:41:51.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "not your bestie anymore",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=HXefOA4MPZQ",
            soundcloudUrl:
                "https://soundcloud.com/latex4000/not-your-bestie-anymore",
            date: new Date("2025-01-17T17:52:10.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "unsaved",
            memberDiscord: "352605625869402123",
            youtubeUrl: null,
            soundcloudUrl: null,
            date: new Date("2025-01-17T22:47:52.000Z"),
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "fake feeling type beat",
            memberDiscord: "352605625869402123",
            youtubeUrl: "https://www.youtube.com/watch?v=bTFUeY6_7Kk",
            soundcloudUrl: null,
            date: new Date("2025-01-18T01:17:52.000Z"),
            tags: ["my awesome tag", "tag2"],
            trackType: "mp3",
            coverType: "jpg",
        },
        {
            title: "unknown",
            memberDiscord: "352605625869402123",
            youtubeUrl: null,
            soundcloudUrl: "https://soundcloud.com/latex4000/unknown",
            date: new Date("2025-01-18T18:22:38.986Z"),
            tags: ["my awesome tag"],
            trackType: "mp3",
            coverType: "jpg",
        },
    ]);
}
