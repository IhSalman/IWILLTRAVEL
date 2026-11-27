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
import { PHOTO_NAME_RE, resolvePlacePhotoUri } from '@/lib/place-photos';

export async function GET(req: Request) {
    const url = new URL(req.url);
    const name = url.searchParams.get('name') || '';
    const requested = parseInt(url.searchParams.get('w') || '1200', 10);

    if (!PHOTO_NAME_RE.test(name)) {
        return NextResponse.json({ error: 'Invalid photo name' }, { status: 400 });
    }
    if (!process.env.GOOGLE_PLACES_API_KEY) {
        return NextResponse.json({ error: 'Photos unavailable' }, { status: 503 });
    }

    try {
        const photoUri = await resolvePlacePhotoUri(name, requested);
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
