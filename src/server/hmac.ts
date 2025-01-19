import { getSecret } from "astro:env/server";
import crypto from "crypto";

export default function checkHmac(request: Request, body: string): boolean {
    const signature = request.headers.get("x-signature");
    const timestamp = request.headers.get("x-timestamp");

    if (!signature || !timestamp)
        return false;

    const hmac = crypto
        .createHmac("sha256", process.env.SECRET_HMAC_KEY ?? getSecret("SECRET_HMAC_KEY") ?? import.meta.env.SECRET_HMAC_KEY)
        .update(`${timestamp}.${body}`)
        .digest();

    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), hmac);
}
