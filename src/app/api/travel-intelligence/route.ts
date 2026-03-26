import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/auth';
import { generateGlobalIntelligence } from './agents';
import { getCache, setCache } from '@/utils/cache';

// Force dynamic — auth requires per-request cookie access.
// Daily caching is handled by the Supabase cache layer below.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Require authentication to protect Gemini API credits
    const authResult = await requireAuth();
    if ('error' in authResult) return authResult.error;
    try {
        console.log('[API] /api/travel-intelligence hit. Generating or fetching from cache...');
        
        // Use a daily rotating cache key so it refreshes once every day automatically
        const today = new Date().toISOString().split('T')[0];
        const CACHE_KEY = `global_intelligence_dashboard_${today}`;
        
        const cachedData = await getCache(CACHE_KEY);
        if (cachedData) {
            console.log('[API] /api/travel-intelligence served from Supabase Cache');
            return NextResponse.json(cachedData);
        }

        const dashboardData = await generateGlobalIntelligence();
        
        // Save to Supabase Cache
        await setCache(CACHE_KEY, dashboardData);

        return NextResponse.json(dashboardData);
    } catch (error: any) {
        console.error('[API] /api/travel-intelligence Error:', error.message);
        return NextResponse.json(
            { error: 'Failed to retrieve travel intelligence data' },
            { status: 500 }
        );
    }
}
