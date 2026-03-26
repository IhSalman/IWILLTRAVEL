import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Map, Cpu, MousePointerClick, Trash2, DollarSign, Brain } from 'lucide-react';
import { MODEL_PRICING } from '@/utils/ai-config';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    );

    // Fetch aggregated statistics
    const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    const { count: itinerariesCount } = await supabase
        .from('itineraries')
        .select('*', { count: 'exact', head: true });

    const { count: affiliateClicks } = await supabase
        .from('affiliate_clicks')
        .select('*', { count: 'exact', head: true });

    const { data: usageData } = await supabase
        .from('ai_usage_logs')
        .select('tokens_used, input_tokens, output_tokens, cost_estimate, model_used, feature_type');

    const totalTokens = usageData?.reduce((acc, curr) => acc + (curr.tokens_used || 0), 0) || 0;
    const totalCost = usageData?.reduce((acc, curr) => acc + (curr.cost_estimate || 0), 0) || 0;

    // Cost breakdown by feature
    const costByFeature: Record<string, { tokens: number; cost: number; count: number }> = {};
    for (const log of usageData || []) {
        const key = log.feature_type || 'unknown';
        if (!costByFeature[key]) costByFeature[key] = { tokens: 0, cost: 0, count: 0 };
        costByFeature[key].tokens += log.tokens_used || 0;
        costByFeature[key].cost += log.cost_estimate || 0;
        costByFeature[key].count += 1;
    }

    // Get active model
    const { data: settingsData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'active_model')
        .single();

    const activeModel = settingsData?.value
        ? String(settingsData.value).replace(/^"|"$/g, '')
        : 'gemini-2.5-flash';

    // Fetch recent users
    const { data: recentUsers } = await supabase
        .from('profiles')
        .select('id, full_name, username, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">
                    Analytics and statistics for iWillTravel AI.
                </p>
            </div>

            {/* Active Model Badge */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border w-fit">
                <Brain className="h-5 w-5 text-primary" />
                <div>
                    <span className="text-xs text-muted-foreground">Active AI Model</span>
                    <div className="font-semibold text-sm">{activeModel}</div>
                </div>
                <a href="/admin/settings" className="text-xs text-primary underline ml-4">Change →</a>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{usersCount || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Itineraries Generated</CardTitle>
                        <Map className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{itinerariesCount || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">AI Tokens Used</CardTitle>
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estimated AI Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">${totalCost.toFixed(4)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Based on actual token usage</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Affiliate Clicks</CardTitle>
                        <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{affiliateClicks || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Cost Breakdown by Feature */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Cost Breakdown by Feature</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(costByFeature)
                                .sort(([, a], [, b]) => b.cost - a.cost)
                                .map(([feature, stats]) => (
                                    <div key={feature} className="flex items-center justify-between">
                                        <div>
                                            <span className="font-medium text-sm capitalize">{feature.replace(/-/g, ' ')}</span>
                                            <span className="text-xs text-muted-foreground ml-2">({stats.count} calls)</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-sm">${stats.cost.toFixed(6)}</div>
                                            <div className="text-xs text-muted-foreground">{stats.tokens.toLocaleString()} tokens</div>
                                        </div>
                                    </div>
                                ))}
                            {Object.keys(costByFeature).length === 0 && (
                                <p className="text-sm text-muted-foreground">No usage data yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-md">User</th>
                                        <th className="px-4 py-3">Joined</th>
                                        <th className="px-4 py-3 text-right rounded-tr-md">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recentUsers?.map((user) => (
                                        <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="font-medium">{user.full_name || 'Anonymous User'}</div>
                                                <div className="text-muted-foreground">{user.username || 'No email provided'}</div>
                                            </td>
                                            <td className="px-4 py-4 text-muted-foreground">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <form action={`/api/admin/users/${user.id}/delete`} method="POST">
                                                    <button type="submit" className="text-destructive hover:text-destructive/80 transition-colors" title="Delete User">
                                                        <Trash2 className="w-4 h-4 ml-auto" />
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    ))}
                                    {!recentUsers?.length && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">
                                                No recent users found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
