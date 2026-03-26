import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Whitelist of allowed fields for destination updates (mass assignment protection)
const ALLOWED_FIELDS = new Set([
    'name', 'country', 'description', 'image_url', 'rating',
    'category', 'price_range', 'region', 'tags', 'highlights',
    'best_season', 'currency', 'language', 'timezone',
]);

function pickAllowedFields(body: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(body)) {
        if (ALLOWED_FIELDS.has(key)) {
            sanitized[key] = body[key];
        }
    }
    return sanitized;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const supabase = await createClient();

        // Verify authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin status
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let body: any;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        // Security: only allow whitelisted fields to prevent mass assignment
        const sanitizedBody = pickAllowedFields(body);

        const { data, error } = await supabase
            .from('destinations')
            .update(sanitizedBody)
            .eq('id', resolvedParams.id)
            .select();

        if (error) {
            console.error('Error updating destination:', error);
            return NextResponse.json({ error: 'Failed to update destination' }, { status: 500 });
        }

        return NextResponse.json({ data });

    } catch (error) {
        console.error('Admin destinations PUT error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params;
        const supabase = await createClient();

        // Verify authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin status
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error } = await supabase
            .from('destinations')
            .delete()
            .eq('id', resolvedParams.id);

        if (error) {
            console.error('Error deleting destination:', error);
            return NextResponse.json({ error: 'Failed to delete destination' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Admin destinations DELETE error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
