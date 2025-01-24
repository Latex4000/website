import { validateHmac } from "@latex4000/fetch-hmac";
import { getSecret } from "astro:env/server";
import { defineMiddleware } from "astro:middleware";
import { jsonError } from "./server/responses";

const checkHmacForApi = defineMiddleware((context, next) => {
	if (!context.url.pathname.startsWith('/api/')) {
		return next();
	}

	return validateHmac(
		process.env.SECRET_HMAC_KEY ?? getSecret("SECRET_HMAC_KEY") ?? import.meta.env.SECRET_HMAC_KEY,
		context.request,
	)
		.then((valid) => valid ? next() : jsonError("Invalid HMAC", 401))
		.catch((error) => {
			console.error(error);
			return jsonError("Internal error when validating HMAC", 500);
		});
});

export const onRequest = checkHmacForApi;
