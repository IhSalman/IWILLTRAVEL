import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { setCache } from '@/utils/cache';
import crypto from 'node:crypto';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Generate a 6-digit alphanumeric code
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const cacheKey = `tg_link_${code}`;

    // Store in cache for 10 minutes
    await setCache(cacheKey, user.id);

    const botUsername = 'iWillTravelBot'; // Replace with actual bot username
    const link = `https://t.me/${botUsername}?start=${code}`;

    return NextResponse.json({ code, link });
}
