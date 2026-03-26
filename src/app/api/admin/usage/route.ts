import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient as createSsrClient } from '@/utils/supabase/server';

/**
 * GET /api/admin/usage — Aggregated AI usage stats for the admin dashboard
 * Supports query params: ?period=7d|30d|all&groupBy=feature|user|model
 */
export async function GET(req: NextRequest) {
    const supabase = await createSsrClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '30d';
    const groupBy = url.searchParams.get('groupBy') || 'feature';

    const admin = createAdminClient();

    // Calculate date filter
    let dateFilter: string | null = null;
    if (period === '7d') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        dateFilter = d.toISOString();
    } else if (period === '30d') {
        const d = new Date(); d.setDate(d.getDate() - 30);
        dateFilter = d.toISOString();
    }

    // Fetch raw logs
    let query = admin.from('ai_usage_logs').select('*').order('created_at', { ascending: false });
    if (dateFilter) {
        query = query.gte('created_at', dateFilter);
    }
    const { data: logs, error } = await query.limit(5000);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const entries = logs || [];

    // Aggregation
    const totalTokens = entries.reduce((sum: number, l: any) => sum + (l.tokens_used || 0), 0);
    const totalInputTokens = entries.reduce((sum: number, l: any) => sum + (l.input_tokens || 0), 0);
    const totalOutputTokens = entries.reduce((sum: number, l: any) => sum + (l.output_tokens || 0), 0);
    const totalCost = entries.reduce((sum: number, l: any) => sum + (l.cost_estimate || 0), 0);
    const totalRequests = entries.length;

    // Group by feature/user/model
    const grouped: Record<string, { tokens: number; cost: number; count: number }> = {};
    for (const log of entries) {
        const key = groupBy === 'user'
            ? (log.user_id || 'unknown').substring(0, 8)
            : groupBy === 'model'
                ? (log.model_used || 'unknown')
                : (log.feature_type || 'unknown');

        if (!grouped[key]) grouped[key] = { tokens: 0, cost: 0, count: 0 };
        grouped[key].tokens += log.tokens_used || 0;
        grouped[key].cost += log.cost_estimate || 0;
        grouped[key].count += 1;
    }

    // Daily breakdown for charts
    const daily: Record<string, { tokens: number; cost: number; count: number }> = {};
    for (const log of entries) {
        const day = log.created_at?.substring(0, 10) || 'unknown';
        if (!daily[day]) daily[day] = { tokens: 0, cost: 0, count: 0 };
        daily[day].tokens += log.tokens_used || 0;
        daily[day].cost += log.cost_estimate || 0;
        daily[day].count += 1;
    }

    return NextResponse.json({
        summary: {
            totalTokens,
            totalInputTokens,
            totalOutputTokens,
            totalCost: Math.round(totalCost * 1000000) / 1000000,
            totalRequests,
            period,
        },
        grouped,
        daily: Object.entries(daily)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, stats]) => ({ date, ...stats })),
        recentLogs: entries.slice(0, 50).map((l: any) => ({
            id: l.id,
            feature: l.feature_type,
            tokens: l.tokens_used,
            inputTokens: l.input_tokens,
            outputTokens: l.output_tokens,
            cost: l.cost_estimate,
            model: l.model_used,
            userId: l.user_id?.substring(0, 8),
            createdAt: l.created_at,
        })),
    });
}
