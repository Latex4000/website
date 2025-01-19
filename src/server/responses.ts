export function jsonError (message: string, status = 400): Response {
    return new Response(JSON.stringify({ error: message }), { status });
}

export function jsonResponse (data: any, status = 200): Response {
    return new Response(JSON.stringify(data), { status });
}