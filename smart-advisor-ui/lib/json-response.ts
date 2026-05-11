/**
 * Safe JSON serializer for Next.js API routes.
 *
 * Prisma returns BigInt values (e.g. expires_at, updated_at stored as BigInt)
 * which JSON.stringify() cannot handle natively, causing:
 *   "TypeError: Do not know how to serialize a BigInt"
 * This error occurs AFTER the response has started, truncating the body and
 * causing the client to receive "SyntaxError: Unexpected end of JSON input".
 *
 * Usage: return jsonResponse(data)  -- replaces NextResponse.json(data)
 */

function bigIntReplacer(_key: string, value: unknown): unknown {
    if (typeof value === 'bigint') return Number(value);
    return value;
}

/**
 * Returns a Response with safely serialized JSON, converting BigInt → number.
 * Drop-in replacement for NextResponse.json().
 */
export function jsonResponse(
    data: unknown,
    init?: { status?: number; headers?: Record<string, string> }
): Response {
    const body = JSON.stringify(data, bigIntReplacer);
    return new Response(body, {
        status: init?.status ?? 200,
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    });
}
