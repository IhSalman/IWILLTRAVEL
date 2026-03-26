import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { getRecommendations } from '../travel-intelligence/agents';
import { getCache, setCache } from '@/utils/cache';

export async function POST(req: Request) {
    // Require authentication to protect Gemini API credits
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;

    try {
        const body = await req.json();
        const { budget, month, interests } = body;

        console.log('[API] /api/travel-recommendation Request:', { budget, month, interests });

        if (!budget || !month || !interests) {
            return NextResponse.json({ error: 'Missing budget, month, or interests parameters' }, { status: 400 });
        }

        const CACHE_KEY = `travel_recs_${budget}_${month}_${interests}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        
        const cachedData = await getCache(CACHE_KEY);
        if (cachedData) {
            console.log('[API] /api/travel-recommendation served from Supabase Cache');
            return NextResponse.json(cachedData);
        }

        const data = await getRecommendations(budget, month, interests);
        
        await setCache(CACHE_KEY, data);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API] /api/travel-recommendation Error:', error.message);
        return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
    }
}
