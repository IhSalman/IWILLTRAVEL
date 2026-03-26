import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createSsrClient } from '@/utils/supabase/server';
import { SUPPORTED_MODELS, MODEL_PRICING, MODEL_INFO, invalidateModelCache } from '@/utils/ai-config';

/**
 * GET /api/admin/settings — Fetch current app settings + model info
 */
export async function GET() {
    const supabase = await createSsrClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data } = await admin.from('app_settings').select('*');

    // Build model options with pricing
    const modelOptions = SUPPORTED_MODELS.map(id => ({
        id,
        ...MODEL_INFO[id],
        pricing: MODEL_PRICING[id],
    }));

    // Get current active model from settings
    const activeModelRow = data?.find((r: any) => r.key === 'active_model');
    const activeModel = activeModelRow?.value
        ? String(activeModelRow.value).replace(/^"|"$/g, '')
        : 'gemini-2.5-flash';

    return NextResponse.json({
        activeModel,
        modelOptions,
        settings: data || [],
    });
}

/**
 * POST /api/admin/settings — Update a setting (e.g., active_model)
 */
export async function POST(req: Request) {
    const supabase = await createSsrClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
        return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    // Validate model selection
    if (key === 'active_model') {
        const cleaned = String(value).replace(/^"|"$/g, '');
        if (!MODEL_PRICING[cleaned]) {
            return NextResponse.json({ error: `Invalid model: ${cleaned}` }, { status: 400 });
        }
    }

    const admin = createAdminClient();
    const { error } = await admin
        .from('app_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidate the in-memory cache so new requests pick up the change
    invalidateModelCache();

    return NextResponse.json({ success: true, key, value });
}
