import { getSecret } from "astro:env/server";
import { validateHmac as validateHmacInternal } from "@latex4000/fetch-hmac";
import { jsonError } from "./responses";

export function validateHmac(request: Request): Promise<boolean> {
	return validateHmacInternal(
		process.env.SECRET_HMAC_KEY ?? getSecret("SECRET_HMAC_KEY") ?? import.meta.env.SECRET_HMAC_KEY,
		request,
	);
}

export function hmacInvalidResponse(): Response {
	return jsonError("Invalid HMAC", 401);
}
