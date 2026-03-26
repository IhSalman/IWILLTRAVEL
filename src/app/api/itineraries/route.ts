import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, itinerary, start_date, end_date, city_id, days, budget, travel_style, traveler_type, interests } = await req.json();

        if (!title || typeof title !== 'string' || !itinerary) {
            return NextResponse.json({ error: 'Missing title or itinerary data' }, { status: 400 });
        }

        if (title.length > 200) {
            return NextResponse.json({ error: 'Title exceeds maximum length of 200 characters' }, { status: 400 });
        }

        const numDays = typeof days === 'number' ? days : parseInt(String(days), 10);
        if (days !== undefined && (isNaN(numDays) || numDays < 1 || numDays > 30)) {
            return NextResponse.json({ error: 'Invalid number of days (1–30)' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('itineraries')
            .insert([
                {
                    user_id: user.id,
                    city_id: city_id || 'custom',
                    title: title,
                    content: itinerary,
                    start_date: start_date,
                    end_date: end_date,
                    days: days || 5,
                    budget: budget,
                    travel_style: travel_style,
                    traveler_type: traveler_type || 'single',
                    interests: interests || [],
                    status: 'saved'
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Database Error saving itinerary:', error);
            return NextResponse.json({ error: 'Failed to save itinerary' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Error in POST /api/itineraries:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('itineraries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Database Error fetching itineraries:', error);
            return NextResponse.json({ error: 'Failed to fetch itineraries' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('Error in GET /api/itineraries:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
