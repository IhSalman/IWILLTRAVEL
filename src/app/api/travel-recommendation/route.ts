import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { getRecommendations } from '../travel-intelligence/agents';
import { getCache, setCache } from '@/utils/cache';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { budget, month, interests } = body;

        console.log('[API] /api/travel-recommendation Request:', { budget, month, interests });

        if (!budget || !month || !interests) {
            return NextResponse.json({ error: 'Missing budget, month, or interests parameters' }, { status: 400 });
        }

        const CACHE_KEY = `travel_recs_${budget}_${month}_${interests}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        
        // Always serve cached results to anyone (public) — cache-first strategy
        const cachedData = await getCache(CACHE_KEY);
        if (cachedData) {
            console.log('[API] /api/travel-recommendation served from Cache (public)');
            return NextResponse.json(cachedData);
        }

        // For fresh AI calls, require authentication to protect Gemini API credits
        const authResult = await requireAuth();
        if ('error' in authResult) {
            return NextResponse.json(
                { 
                    error: 'Sign in to unlock personalised AI recommendations',
                    requiresAuth: true 
                },
                { status: 401 }
            );
        }

        const data = await getRecommendations(budget, month, interests);
        
        await setCache(CACHE_KEY, data);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[API] /api/travel-recommendation Error:', error.message);
        return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
    }
}
