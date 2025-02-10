export interface MemberType {
    discord: string;
    alias: string;
    site: string | null;
    addedRingToSite: boolean;
    color: string;
}

export interface SoundType {
    id: number;
    title: string;
    memberDiscord: MemberType["discord"];
    youtubeUrl: string | null;
    soundcloudUrl: string | null;
    date: Date;
    tags: string[];
    trackType: "mp3" | "wav";
    coverType: "jpg" | "png";
    deleted: boolean;
}

export interface WordType {
    id: number;
    deleted: boolean;
    date: Date;
    memberDiscord: MemberType["discord"];
    tags: string[];
    title: string;
}

export interface MotionType {
    id: number;
    title: string;
    youtubeUrl: string;
    memberDiscord: MemberType["discord"];
    date: Date;
    tags: string[];
    deleted: boolean;
}

export interface ActionType {
    id: number;
    memberDiscord: MemberType["discord"];
    title: string;
    description: string;
    url: string;
    siteUrl: string;
    isRSS: boolean;
}

export interface ActionItemType {
    id: number;
    actionID: ActionType["id"];
    title: string | null;
    description: string;
    url: string;
    date: Date;
}