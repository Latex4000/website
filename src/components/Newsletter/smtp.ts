import { createTestAccount, createTransport, getTestMessageUrl, type Transporter } from "nodemailer";
import type SMTPConnection from "nodemailer/lib/smtp-pool";

// lazy async cuz the transportoptions initialization is kinda aids for the dev env otherwise
type transportOptions = Omit<SMTPConnection.Options, "pool"> & { auth: { user: string; pass: string } };
export let transporter: Transporter | undefined = undefined;
export let transportOptions: transportOptions | undefined = undefined;
async function getTransporter(): Promise<[Transporter, transportOptions]> {
    if (transporter && transportOptions)
        return [transporter, transportOptions];

    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        if (process.env.NODE_ENV === "development")
            console.warn("Email configuration environment variables are not fully set. Falling back to test account.");
        else
            throw new Error("Email configuration environment variables are not fully set");
    }

    transportOptions = {
        host: process.env.EMAIL_HOST!,
        port: parseInt(process.env.EMAIL_PORT!),
        secure: process.env.EMAIL_PORT === "465", // true for 465 cuz its the SSL port, false for other ports, see https://archive.is/NiwXg
        auth: {
            user: process.env.EMAIL_USER!,
            pass: process.env.EMAIL_PASSWORD!,
        },
    };

    if (process.env.NODE_ENV === "development") {
        const testAccount = await createTestAccount();
        console.log(`Test email account created. Your email is ${testAccount.user} and your password is ${testAccount.pass}`);
        transportOptions = {
            host: testAccount.smtp.host,
            port: testAccount.smtp.port,
            secure: testAccount.smtp.secure,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        };
    }
    transporter = createTransport(transportOptions);
    return [transporter, transportOptions];
}

export async function sendEmail(subject: string, html: string, text: string, bcc: string[]): Promise<void>
export async function sendEmail(subject: string, html: string, text: string, to: string): Promise<void>
export async function sendEmail(subject: string, html: string, text: string, toOrBcc: string | string[]): Promise<void> {
    const [transporter, transportOptions] = await getTransporter();
    const info = await transporter.sendMail({
        from: `"LaTeX 4000" <${transportOptions.auth.user}>`,
        to: typeof toOrBcc === "string" ? toOrBcc : undefined,
        bcc: Array.isArray(toOrBcc) ? toOrBcc : undefined, 
        subject,
        html,
        text,
    });

    if (process.env.NODE_ENV === "development")
        console.log("Preview URL:", getTestMessageUrl(info) || "N/A");
}