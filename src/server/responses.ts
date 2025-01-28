export function jsonError(message: string, status = 400): Response {
    return jsonResponse({ error: message }, status);
}

export function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" }, status });
}

export class ResponseError extends Error {
    readonly response: Response;

    constructor(message?: Response | string, status = 400) {
        super();

        this.response = message instanceof Response
            ? message
            : new Response(message ?? "", { status });

        Object.setPrototypeOf(this, ResponseError.prototype);
    }
}

export class JsonResponseError extends ResponseError {
    constructor(message: string, status = 400) {
        super(jsonError(message, status));

        Object.setPrototypeOf(this, JsonResponseError.prototype);
    }
}
