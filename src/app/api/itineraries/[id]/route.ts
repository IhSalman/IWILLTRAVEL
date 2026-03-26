import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();

        // Check auth status
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: itinerary, error } = await supabase
            .from('itineraries')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id) // Ensure user owns the itinerary
            .single();

        if (error) {
            console.error('Error fetching itinerary by ID:', error);
            return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 });
        }

        return NextResponse.json(itinerary);
    } catch (err: any) {
        console.error('Error in GET /api/itineraries/[id]:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
