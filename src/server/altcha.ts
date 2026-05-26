import { randomInt } from "node:crypto";
import {
    createChallenge as altcha_createChallenge,
    verifySolution as altcha_verifySolution,
    type Challenge,
    type Solution,
    type VerifySolutionResult,
} from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";

if (!process.env.ALTCHA_HMAC_SIGNATURE_SECRET) {
    throw new Error("ALTCHA_HMAC_SIGNATURE_SECRET not set");
}
if (!process.env.ALTCHA_HMAC_KEY_SIGNATURE_SECRET) {
    throw new Error("ALTCHA_HMAC_KEY_SIGNATURE_SECRET not set");
}

const secrets = {
    hmacSignatureSecret: process.env.ALTCHA_HMAC_SIGNATURE_SECRET,
    hmacKeySignatureSecret: process.env.ALTCHA_HMAC_KEY_SIGNATURE_SECRET,
};

export function createChallenge(): Promise<Challenge> {
    return altcha_createChallenge({
        algorithm: "PBKDF2/SHA-256",
        cost: 5000,
        counter: randomInt(5_000, 10_000),
        deriveKey,
        expiresAt: new Date(Date.now() + 300_000),
        ...secrets,
    });
}

export async function verifySolution(
    options:
        | {
              challenge: Challenge;
              solution: Solution;
          }
        | string
): Promise<VerifySolutionResult | false> {
    if (typeof options === "string") {
        try {
            // todo should check the exact structure of this json
            options = JSON.parse(atob(options)) as {
                challenge: Challenge;
                solution: Solution;
            };
        } catch {
            return false;
        }
    }

    return altcha_verifySolution({
        deriveKey,
        ...options,
        ...secrets,
    });
}
