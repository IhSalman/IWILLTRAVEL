/** Serves the IndexNow key so search engines can verify pings (see src/lib/guides/indexnow.ts). */
export function GET() {
    const key = process.env.INDEXNOW_KEY;
    if (!key) return new Response('Not found', { status: 404 });
    return new Response(key, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
