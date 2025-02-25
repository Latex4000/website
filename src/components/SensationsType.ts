export interface SensationList {
    id: number;
    date: string; // ISO strings for serialization purposes
    causes: {
        core: string[];
        preConds: string[];
        history: string[];
    };
    effects: {
        physical: string[];
        mental: string[];
    };
    possibleResponses: {
        helpful: string[];
        harmful: string[];
        neutral: string[];
    };
    mainEmotion: string;
    subEmotion: string[];
}

export function isSensationList(arg: any): arg is SensationList {
    return (
        arg.id !== undefined && typeof arg.id === 'number' && // id
        arg.date !== undefined && typeof arg.date === 'string' && new Date(arg.date).toString() !== 'Invalid Date' && // date
        arg.causes !== undefined && // causes
        arg.causes.core !== undefined && Array.isArray(arg.causes.core) && // causes.core
        arg.causes.preConds !== undefined && Array.isArray(arg.causes.preConds) && // causes.preConds
        arg.causes.history !== undefined && Array.isArray(arg.causes.history) && // causes.history
        arg.effects !== undefined && // effects
        arg.effects.physical !== undefined && Array.isArray(arg.effects.physical) && // effects.physical
        arg.effects.mental !== undefined && Array.isArray(arg.effects.mental) && // effects.mental
        arg.possibleResponses !== undefined && // possibleResponses
        arg.possibleResponses.helpful !== undefined && Array.isArray(arg.possibleResponses.helpful) && // possibleResponses.helpful
        arg.possibleResponses.harmful !== undefined && Array.isArray(arg.possibleResponses.harmful) && // possibleResponses.harmful
        arg.possibleResponses.neutral !== undefined && Array.isArray(arg.possibleResponses.neutral) && // possibleResponses.neutral
        arg.mainEmotion !== undefined && typeof arg.mainEmotion === 'string' && // mainEmotion
        arg.subEmotion !== undefined && Array.isArray(arg.subEmotion) && // subEmotion
        arg.subEmotion.every((x: any) => typeof x === 'string') // subEmotion
    );
}

export function isSensationListArray(arg: any): arg is SensationList[] {
    return Array.isArray(arg) && arg.every((x) => isSensationList(x));
}

export const mainEmotions = [
    "anger",
    "fear",
    "disgust",
    "sadness",
    "enjoyment",
] as const;
export type MainEmotion = (typeof mainEmotions)[number];
export const emotionColours: Record<MainEmotion | "other", [number, number, number]> = {
    anger: [216, 82, 69],
    fear: [193, 48, 191],
    disgust: [0, 125, 62],
    sadness: [93, 167, 214],
    enjoyment: [245, 152, 41],
    other: [128, 128, 128],
};
export const subEmotions: Record<MainEmotion, string[]> = {
    anger: [
        "annoyance",
        "frustration",
        "exasperation",
        "argumentative",
        "bitterness",
        "vengefulness",
        "fury",
    ],
    fear: [
        "trepidation",
        "nervousness",
        "anxiety",
        "dread",
        "desperation",
        "panic",
        "horror",
        "terror",
    ],
    disgust: [
        "dislike",
        "aversion",
        "distaste",
        "repugnance",
        "revulsion",
        "abhorrence",
        "loathing",
    ],
    sadness: [
        "disappointment",
        "discouragement",
        "distraught",
        "resignation",
        "helplessness",
        "hopelessness",
        "misery",
        "despair",
        "grief",
        "sorrow",
        "anguish",
    ],
    enjoyment: [
        "pleasure",
        "rejoicing",
        "compassion",
        "amusement",
        "schadenfreude",
        "relief",
        "peace",
        "pride",
        "wonder",
        "excitement",
        "ecstasy",
    ],
};

export const exampleSensationLists: () => SensationList[] = () => ([
    {
        id: Date.now(),
        date: new Date().toISOString(),
        causes: {
            core: ["A friend was angry at me"],
            preConds: ["I was tired and low on sleep"],
            history: ["I was bullied as a child"],
        },
        effects: {
            physical: ["I felt a pit in my stomach", "I felt tense"],
            mental: ["I felt I was being attacked", "I felt defensive"],
        },
        possibleResponses: {
            helpful: ["I can talk to my friend and apologize", "I can take a time out"],
            harmful: ["I can yell back at my friend", "I can ignore my friend"],
            neutral: ["I can do nothing", "I can walk away"],
        },
        mainEmotion: "anger",
        subEmotion: ["annoyance", "frustration"],
    }, {
        id: Date.now(),
        date: new Date().toISOString(),
        causes: {
            core: ["A friend was angry at me"],
            preConds: ["I was reading really sad news"],
            history: ["I was reminded of abandonment"],
        },
        effects: {
            physical: ["I felt a pit in my stomach", "My heart raced"],
            mental: ["I felt that I was going to be abandoned", "I felt like I was a failure"],
        },
        possibleResponses: {
            helpful: ["I can recall why we are friends", "I can talk to my friend and apologize"],
            harmful: ["I can imagine my friend abandoning me", "I can yell back at my friend"],
            neutral: ["I can do nothing"],
        },
        mainEmotion: "fear",
        subEmotion: ["trepidation", "anxiety"],
    }, {
        id: Date.now(),
        date: new Date().toISOString(),
        causes: {
            core: ["A friend was angry at me"],
            preConds: ["I was grieving the loss of a loved one"],
            history: ["This reminded me of insensitive behaviour and actions"],
        },
        effects: {
            physical: ["I recoiled", "My stomach turned"],
            mental: ["I felt appalled at their behaviour", "I felt sickened"],
        },
        possibleResponses: {
            helpful: ["I can ask why they are angry", "I can try to understand their perspective"],
            harmful: ["I can belittle their feelings", "I can yell back at them for being insensitive"],
            neutral: ["I can avoid them", "I can do nothing"],
        },
        mainEmotion: "disgust",
        subEmotion: ["dislike", "aversion"],
    }, {
        id: Date.now(),
        date: new Date().toISOString(),
        causes: {
            core: ["A friend was angry at me"],
            preConds: ["I was feeling exhausted and overwhelmed"],
            history: ["I was reminded of being rejected for existing"],
        },
        effects: {
            physical: ["I felt weak", "I was on the verge of tears"],
            mental: ["I felt empty", "I felt like I was a burden", "I felt like I was a failure"],
        },
        possibleResponses: {
            helpful: ["I can ask for help", "I can seek comfort"],
            harmful: ["I can be self-deprecating", "I can be ashamed of my feelings"],
            neutral: ["I can do nothing", "I can avoid my friend", "I can ignore the feeling"],
        },
        mainEmotion: "sadness",
        subEmotion: ["disappointment", "discouragement"],
    }, {
        id: Date.now(),
        date: new Date().toISOString(),
        causes: {
            core: ["A friend was angry at me"],
            preConds: ["I scored a touchdown"],
            history: ["My friend seems like a sore loser"],
        },
        effects: {
            physical: ["I felt a rush of energy", "I felt a surge of power"],
            mental: ["I felt like I was on top of the world", "I felt like I was the best", "I thought I was righteously indignant"],
        },
        possibleResponses: {
            helpful: ["I can keep playing", "I can be a good sport"],
            harmful: ["I can gloat", "I can be a sore winner"],
            neutral: ["I can celebrate", "I can ignore my friend"],
        },
        mainEmotion: "enjoyment",
        subEmotion: ["sensory pleasure", "rejoicing"],
    },
]);