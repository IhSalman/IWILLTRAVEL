import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';

const FLOAT_RE = /^-?\d+(\.\d+)?$/;
const COORDS_RE = /^(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)$/;

export async function GET(req: Request) {
    // Require authentication to protect Mapbox API credits
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'overview';
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');
        const coords = searchParams.get('coords');

        const TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
        if (!TOKEN) {
            return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 });
        }

        if (type === 'overview') {
            if (!lat || !lng) {
                return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
            }
            if (!FLOAT_RE.test(lat) || !FLOAT_RE.test(lng)) {
                return NextResponse.json({ error: 'Invalid coordinate format' }, { status: 400 });
            }
            const safeLat = parseFloat(lat);
            const safeLng = parseFloat(lng);
            if (safeLat < -90 || safeLat > 90 || safeLng < -180 || safeLng > 180) {
                return NextResponse.json({ error: 'Coordinates out of valid range' }, { status: 400 });
            }
            const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l+ef4444(${safeLng},${safeLat})/${safeLng},${safeLat},11,0/800x500@2x?access_token=${TOKEN}&logo=false`;
            return NextResponse.json({ url });
        }

        if (type === 'route') {
            if (!coords) {
                return NextResponse.json({ error: 'Missing coordinates for route' }, { status: 400 });
            }
            const pairs = coords.split(';');
            if (pairs.length < 2 || pairs.length > 50) {
                return NextResponse.json({ error: 'Route must have between 2 and 50 coordinate pairs' }, { status: 400 });
            }
            // Validate each coordinate pair
            for (const pair of pairs) {
                if (!COORDS_RE.test(pair.trim())) {
                    return NextResponse.json({ error: 'Invalid coordinate pair in route' }, { status: 400 });
                }
            }

            const pinString = pairs.map((c, i) => {
                const [clng, clat] = c.trim().split(',');
                const color = i === 0
                    ? '22c55e'
                    : i === pairs.length - 1
                        ? 'ef4444'
                        : '3b82f6';
                return `pin-s+${color}(${parseFloat(clng)},${parseFloat(clat)})`;
            }).join(',');

            const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pinString}/auto/800x500@2x?access_token=${TOKEN}&logo=false`;
            return NextResponse.json({ url });
        }

        return NextResponse.json({ error: 'Invalid map type' }, { status: 400 });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Map generation failed';
        console.error('Mapbox API Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
