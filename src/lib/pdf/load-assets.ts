/**
 * Fetch photos and day route maps for the itinerary PDF.
 *
 * Security: itinerary JSON comes from the client, so image URLs are untrusted.
 * We only fetch (a) Google Places photos resolved by resource name, or
 * (b) a short allow-list of image CDNs — never arbitrary hosts (no SSRF).
 */
import { photoNameFromUrl, resolvePlacePhotoUri } from '@/lib/place-photos';
import { cached, DAY_MS } from '@/utils/cache';
import type { ItineraryPdfModel, PdfDay, PdfImage } from './types';

const ALLOWED_IMAGE_HOSTS = [/(^|\.)googleusercontent\.com$/i, /^images\.unsplash\.com$/i, /^plus\.unsplash\.com$/i];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PHOTOS = 40;

function detectFormat(buf: Buffer): PdfImage['format'] | null {
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
    return null; // webp/gif etc. are not supported by the PDF engine
}

async function fetchImage(url: string): Promise<PdfImage | null> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'follow' });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) return null;
        const format = detectFormat(buf);
        return format ? { data: buf, format } : null;
    } catch {
        return null;
    }
}

/** Resolve a stored photo URL (proxy, legacy Places, or allowed CDN) to image bytes. */
export async function loadPhoto(url: string | null | undefined, width = 800): Promise<PdfImage | null> {
    if (!url) return null;
    const placeName = photoNameFromUrl(url);
    if (placeName) {
        const uri = await resolvePlacePhotoUri(placeName, width).catch(() => null);
        return uri ? fetchImage(uri) : null;
    }
    try {
        const u = new URL(url);
        // Older trips stored legacy Place Photo URLs (photo_reference). Rebuild them
        // server-side with our key — any key embedded in the stored URL is ignored.
        if (u.hostname === 'maps.googleapis.com' && u.pathname === '/maps/api/place/photo') {
            const ref = u.searchParams.get('photo_reference') || u.searchParams.get('photoreference');
            const key = process.env.GOOGLE_PLACES_API_KEY;
            if (!ref || !key || !/^[A-Za-z0-9_-]+$/.test(ref)) return null;
            return fetchImage(
                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${ref}&key=${key}`
            );
        }
        if (u.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.some((re) => re.test(u.hostname))) return null;
        return fetchImage(u.toString());
    } catch {
        return null;
    }
}

/**
 * Current Places photo resource name for a place, looked up by name + area.
 * Used when a stored photo reference has expired (Google rotates them) or a stop
 * has no photo. Cached for 30 days.
 */
async function findPlacePhotoName(query: string): Promise<string | null> {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key || !query.trim()) return null;
    return cached<string | null>(`pdfphoto:v1:${query.trim().toLowerCase()}`, 30 * DAY_MS, async () => {
        try {
            const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.photos.name' },
                body: JSON.stringify({ textQuery: query, maxResultCount: 1, languageCode: 'en' }),
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) return null;
            const data = await res.json();
            const name = data?.places?.[0]?.photos?.[0]?.name;
            return typeof name === 'string' ? name : null;
        } catch {
            return null;
        }
    });
}

/** Stored photo first; if it fails or is missing, the place's current photo. */
export async function loadPhotoWithFallback(url: string | null | undefined, query: string, width = 800): Promise<PdfImage | null> {
    const direct = await loadPhoto(url, width);
    if (direct) return direct;
    const name = await findPlacePhotoName(query);
    return name ? loadPhoto(`/api/place-photo?name=${encodeURIComponent(name)}`, width) : null;
}

/**
 * Minimal, print-friendly route map for one day via the Google Static Maps API.
 * Numbered markers match the stop numbers in the PDF. Skipped silently if the
 * API isn't enabled for the key.
 */
export async function loadDayMap(day: PdfDay): Promise<PdfImage | null> {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    const pts = day.stops.filter((s) => s.lat != null && s.lng != null).slice(0, 9);
    if (!key || pts.length === 0) return null;

    const style = [
        'feature:poi|visibility:off',
        'feature:transit|visibility:simplified',
        'element:labels.icon|visibility:off',
        'feature:water|color:0xc9d8e6',
        'feature:landscape|color:0xf4f1ec',
        'feature:road|element:geometry|color:0xffffff',
    ]
        .map((s) => `&style=${encodeURIComponent(s)}`)
        .join('');
    const markers = pts
        .map((s) => `&markers=${encodeURIComponent(`color:0xE8853A|label:${s.index}|${s.lat},${s.lng}`)}`)
        .join('');
    const path =
        pts.length > 1
            ? `&path=${encodeURIComponent(`color:0x16171BAA|weight:3|${pts.map((s) => `${s.lat},${s.lng}`).join('|')}`)}`
            : '';
    const url = `https://maps.googleapis.com/maps/api/staticmap?size=640x300&scale=2&maptype=roadmap${style}${markers}${path}&key=${key}`;
    return fetchImage(url);
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
    const queue = [...items];
    await Promise.all(
        Array.from({ length: Math.min(limit, queue.length) }, async () => {
            while (queue.length) await fn(queue.shift()!);
        })
    );
}

/** Attach photos (stops + cover) and day maps to the model in place. */
export async function loadPdfAssets(model: ItineraryPdfModel): Promise<{ photos: number; maps: number }> {
    const city = model.destination;
    const stops = model.days.flatMap((d) => d.stops).slice(0, MAX_PHOTOS);
    let photos = 0;
    let maps = 0;

    // Best-rated stop (with a stored photo, else any) becomes the cover image.
    const score = (s: (typeof stops)[number]) => (s.rating ?? 0) * Math.log10(10 + (s.totalRatings ?? 0));
    const coverStop = [...stops].sort((a, b) => Number(!!b.photoUrl) - Number(!!a.photoUrl) || score(b) - score(a))[0];

    await Promise.all([
        mapLimit(stops, 6, async (s) => {
            const img = await loadPhotoWithFallback(s.photoUrl, `${s.title}, ${s.address || city}`, 800);
            if (img) {
                s.photo = img;
                photos++;
            }
        }),
        (async () => {
            if (!coverStop) return;
            model.cover =
                (await loadPhotoWithFallback(coverStop.photoUrl, `${coverStop.title}, ${coverStop.address || city}`, 1200)) ??
                undefined;
        })(),
        mapLimit(model.days, 4, async (d) => {
            const m = await loadDayMap(d);
            if (m) {
                d.map = m;
                maps++;
            }
        }),
    ]);

    return { photos, maps };
}
