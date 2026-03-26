import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { processItineraryToBlog } from '@/app/api/travel-intelligence/content-agent';

export async function POST(req: NextRequest) {
    // Security: require authentication AND admin role
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (profile?.is_admin !== true) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { itinerary, input } = await req.json();

        if (!itinerary || !input || !input.destination) {
            return NextResponse.json({ error: 'Missing required itinerary data' }, { status: 400 });
        }

        console.log(`[Admin] Received itinerary for ${input.destination}. Spawning Content Agent...`);
        await processItineraryToBlog(itinerary, input);

        return NextResponse.json({ success: true, message: 'Content Agent finished processing.' });
    } catch (error: any) {
        console.error('[Admin] Process Itinerary Error:', error.message);
        // Security: never leak internal error details to the client
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
    }
}

