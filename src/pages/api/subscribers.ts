import type { APIRoute } from "astro";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import db, { retryIfDbBusy } from "../../database/db";
import { Subscriber, SubscriberPreference } from "../../database/schema";
import { jsonError, jsonResponse } from "../../server/responses";

export const prerender = false;

const THING_LABELS: Record<"sound" | "motion" | "sight" | "word", string> = {
    sound: "Sounds",
    motion: "Motions",
    sight: "Sights",
    word: "Words",
};

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createToken(): string {
    return randomBytes(24).toString("hex");
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<void> {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME ?? "LaTeX 4000";

    if (!apiKey || !senderEmail) {
        if (import.meta.env.DEV) {
            console.info("[newsletter] Email send skipped (missing Brevo config)", {
                to,
                subject,
                html,
                text,
            });
            return;
        }

        throw new Error("Email service is not configured");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "api-key": apiKey,
        },
        body: JSON.stringify({
            sender: { email: senderEmail, name: senderName },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API error: ${response.status} ${errorText}`);
    }
}

function buildVerificationEmail(baseUrl: string, token: string, categories: ("sound" | "motion" | "sight" | "word")[]): { subject: string; html: string; text: string } {
    const verifyUrl = new URL("/email/verify", baseUrl);
    verifyUrl.searchParams.set("token", token);

    const intro = "Confirm your LaTeX 4000 updates subscription";
    const lines = [
        intro,
        "",
        "You'll get a daily digest when we post new:",
        ...categories.map((category) => `• ${THING_LABELS[category]}`),
        "",
        "Confirm your email:",
        verifyUrl.toString(),
        "",
        "If you didn't request this, you can ignore the email.",
    ];

    const text = lines.join("\n");

    const html = `<!doctype html><html><body style="font-family: sans-serif; line-height: 1.5; color: #111;">
        <p>${intro}</p>
        <p>You'll get a daily digest when we post new:</p>
        <ul>${categories.map((category) => `<li>${THING_LABELS[category]}</li>`).join("")}</ul>
        <p><a href="${verifyUrl.toString()}">Confirm your email</a></p>
        <p>If you didn't request this, you can ignore the email.</p>
    </body></html>`;

    return { subject: intro, html, text };
}

export const POST: APIRoute = async (context) => {
    if (context.request.headers.get("content-type") !== "application/json") {
        return jsonError("Request body must be JSON");
    }

    let payload: unknown;
    try {
        payload = await context.request.json();
    } catch {
        return jsonError("Invalid JSON body");
    }

    const email = typeof (payload as { email?: unknown }).email === "string" ? normalizeEmail((payload as { email: string }).email) : undefined;
    const categoriesInput = (payload as { categories?: unknown }).categories;

    if (!email) {
        return jsonError("Email is required");
    }

    if (!isValidEmail(email)) {
        return jsonError("Email looks invalid");
    }

    if (!Array.isArray(categoriesInput)) {
        return jsonError("Categories must be an array");
    }

    const categories = Array.from(new Set(
        categoriesInput
            .filter((value): value is string => typeof value === "string")
            .filter((value): value is "sound" | "motion" | "sight" | "word" => Boolean(value))
    ));

    if (categories.length === 0) {
        return jsonError("Select at least one category");
    }

    const baseUrl = import.meta.env.PUBLIC_SITE_URL ?? new URL("./", context.request.url).origin;

    let shouldSendVerification = false;
    let verificationToken: string | undefined;

    try {
        await retryIfDbBusy(() =>
            db.transaction(async (tx) => {
                const existing = await tx.select().from(Subscriber).where(eq(Subscriber.email, email)).get();

                let subscriberId: number;

                if (!existing) {
                    const newVerifyToken = createToken();
                    const newUnsubscribeToken = createToken();

                    const inserted = await tx
                        .insert(Subscriber)
                        .values({
                            email,
                            verifyToken: newVerifyToken,
                            unsubscribeToken: newUnsubscribeToken,
                            verifiedAt: null,
                            unsubscribedAt: null,
                        })
                        .returning()
                        .get();

                    subscriberId = inserted.id;
                    shouldSendVerification = true;
                    verificationToken = newVerifyToken;
                } else {
                    subscriberId = existing.id;

                    await tx
                        .delete(SubscriberPreference)
                        .where(eq(SubscriberPreference.subscriberId, subscriberId));

                    if (existing.unsubscribedAt !== null || existing.verifiedAt === null) {
                        const newVerifyToken = createToken();
                        const newUnsubscribeToken = createToken();

                        await tx
                            .update(Subscriber)
                            .set({
                                verifyToken: newVerifyToken,
                                unsubscribeToken: newUnsubscribeToken,
                                unsubscribedAt: null,
                                verifiedAt: null,
                            })
                            .where(eq(Subscriber.id, subscriberId));

                        shouldSendVerification = true;
                        verificationToken = newVerifyToken;
                    }
                }

                await tx.insert(SubscriberPreference).values(
                    categories.map((thingType) => ({ subscriberId, thingType }))
                );
            })
        );
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to save subscription", 500);
    }

    if (!shouldSendVerification) {
        return jsonResponse({ status: "updated" });
    }

    const { subject, html, text } = buildVerificationEmail(baseUrl, verificationToken!, categories); // eslint-disable-line @typescript-eslint/no-non-null-assertion

    try {
        await sendEmail(email, subject, html, text);
    } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Failed to send verification email", 500);
    }

    return jsonResponse({ status: "pendingVerification" });
};
