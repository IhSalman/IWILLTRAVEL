import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();

        // 1. Authenticate the request
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Verify the requester is an admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (profile?.is_admin !== true) {
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        const { id: targetUserId } = await params;

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target User ID is required' }, { status: 400 });
        }

        // Protect against accidental self-deletion
        if (targetUserId === user.id) {
            return NextResponse.json({ error: 'Cannot delete your own admin account.' }, { status: 400 });
        }

        // 3. Use the shared admin client factory (service role key via server-only util)
        const supabaseAdmin = createAdminClient();

        // 4. Delete from auth.users — profiles cascade automatically per schema ON DELETE CASCADE
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

        if (deleteError) {
            console.error('Failed to delete user:', deleteError);
            return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
        }

        return NextResponse.redirect(new URL('/admin', request.url), 303);

    } catch (error) {
        console.error('Admin Delete User Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
