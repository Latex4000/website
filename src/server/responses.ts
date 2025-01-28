export function jsonError(message: string, status = 400): Response {
    return new Response(JSON.stringify({ error: message }), { status });
}

export function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), { status });
}

export class ResponseError extends Error {
    readonly response: Response;

    constructor(message?: string, status = 400) {
      super();

      this.response = new Response(message, { status });

      Object.setPrototypeOf(this, ResponseError.prototype);
    }
}

export class JsonResponseError extends ResponseError {
    constructor(message: string, status = 400) {
        super(JSON.stringify({ error: message }), status);

        Object.setPrototypeOf(this, JsonResponseError.prototype);
    }
}
