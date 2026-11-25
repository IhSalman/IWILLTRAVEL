/**
 * GET /api/place-photo?name=places/{placeId}/photos/{photoRef}&w=1200
 *
 * Serves Google Places photos WITHOUT exposing the API key to browsers.
 * Previously photo URLs embedded `&key=...`, leaking the key to every visitor
 * and into every saved itinerary.
 *
 * Flow: ask the Places media endpoint for a key-free `photoUri`
 * (skipHttpRedirect=true), cache it for a day, then 302-redirect to it.
 * The redirect itself is CDN-cacheable, so repeat views cost nothing.
 */
import { NextResponse } from 'next/server';
import { cached, DAY_MS } from '@/utils/cache';

const PHOTO_NAME_RE = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const ALLOWED_WIDTHS = [400, 800, 1200];

export async function GET(req: Request) {
    const url = new URL(req.url);
    const name = url.searchParams.get('name') || '';
    const requested = parseInt(url.searchParams.get('w') || '1200', 10);
    const width = ALLOWED_WIDTHS.find(w => w >= requested) ?? 1200;

    if (!PHOTO_NAME_RE.test(name)) {
        return NextResponse.json({ error: 'Invalid photo name' }, { status: 400 });
    }
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) {
        return NextResponse.json({ error: 'Photos unavailable' }, { status: 503 });
    }

    try {
        const photoUri = await cached<string | null>(`photo:v1:${name}:${width}`, DAY_MS, async () => {
            const res = await fetch(
                `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${width}&skipHttpRedirect=true`,
                { headers: { 'X-Goog-Api-Key': key }, signal: AbortSignal.timeout(8000) }
            );
            if (!res.ok) return null;
            const data = await res.json();
            return typeof data.photoUri === 'string' ? data.photoUri : null;
        });

        if (!photoUri) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
        }

        return NextResponse.redirect(photoUri, {
            status: 302,
            headers: {
                // Browsers and the Vercel CDN reuse the redirect for a day.
                'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
            },
        });
    } catch (err) {
        console.warn('[place-photo] Failed:', err);
        return NextResponse.json({ error: 'Photo unavailable' }, { status: 502 });
    }
}
