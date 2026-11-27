/**
 * Admin review of AI-generated blog posts.
 *
 *   GET   /api/admin/blogs/:id                         — post incl. any pending update
 *   PATCH /api/admin/blogs/:id  { action }             — 'publish' | 'unpublish' | 'apply_pending' | 'discard_pending'
 *
 * AI content is always saved as a draft (or, for live posts, as metadata.pending_content);
 * nothing reaches readers until an admin acts here.
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/require-admin';
import { createAdminClient } from '@/utils/supabase/admin';

const ACTIONS = ['publish', 'unpublish', 'apply_pending', 'discard_pending'] as const;
type Action = (typeof ACTIONS)[number];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if ('error' in guard) return guard.error;
    const { id } = await params;
    const { data, error } = await createAdminClient().from('blogs').select('*').eq('id', id).maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const guard = await requireAdmin();
    if ('error' in guard) return guard.error;
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const action = body?.action as Action;
    if (!ACTIONS.includes(action)) {
        return NextResponse.json({ error: `action must be one of: ${ACTIONS.join(', ')}` }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: blog } = await supabase.from('blogs').select('id, status, metadata').eq('id', id).maybeSingle();
    if (!blog) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const metadata = { ...(blog.metadata || {}) } as Record<string, unknown>;
    const pending = metadata.pending_content as string | undefined;
    delete metadata.pending_content;
    delete metadata.pending_since;

    let update: Record<string, unknown>;
    switch (action) {
        case 'publish':
            update = { status: 'published', published_at: new Date().toISOString() };
            break;
        case 'unpublish':
            update = { status: 'draft' };
            break;
        case 'apply_pending':
            if (!pending) return NextResponse.json({ error: 'No pending update' }, { status: 400 });
            update = { content: pending, metadata };
            break;
        case 'discard_pending':
            update = { metadata };
            break;
    }

    const { error } = await supabase.from('blogs').update(update).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, id, action });
}
