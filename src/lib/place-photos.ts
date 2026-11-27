/**
 * Google Places photo helpers (server-only).
 * Resolves a Places photo resource name to Google's key-free `photoUri`,
 * cached for a day, so neither browsers nor PDFs ever see the API key.
 */
import { cached, DAY_MS } from '@/utils/cache';

export const PHOTO_NAME_RE = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
export const ALLOWED_PHOTO_WIDTHS = [400, 800, 1200] as const;

export function normalizePhotoWidth(requested: number): number {
    return ALLOWED_PHOTO_WIDTHS.find((w) => w >= requested) ?? 1200;
}

export async function resolvePlacePhotoUri(name: string, width = 800): Promise<string | null> {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key || !PHOTO_NAME_RE.test(name)) return null;
    const w = normalizePhotoWidth(width);
    return cached<string | null>(`photo:v1:${name}:${w}`, DAY_MS, async () => {
        const res = await fetch(
            `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&skipHttpRedirect=true`,
            { headers: { 'X-Goog-Api-Key': key }, signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.photoUri === 'string' ? data.photoUri : null;
    });
}

/**
 * Extract the Places photo resource name from any photo URL shape we have stored:
 *  - new:    /api/place-photo?name=places/…/photos/…&w=1200
 *  - legacy: https://places.googleapis.com/v1/places/…/photos/…/media?…&key=…
 */
export function photoNameFromUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const u = new URL(url, 'http://local');
        if (u.pathname === '/api/place-photo') {
            const n = u.searchParams.get('name');
            return n && PHOTO_NAME_RE.test(n) ? n : null;
        }
        if (u.hostname === 'places.googleapis.com') {
            const m = u.pathname.match(/^\/v1\/(places\/[^/]+\/photos\/[^/]+)\/media$/);
            return m && PHOTO_NAME_RE.test(m[1]) ? m[1] : null;
        }
    } catch {
        /* ignore */
    }
    return null;
}
