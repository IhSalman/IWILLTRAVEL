'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, DollarSign, BarChart3, ArrowUpDown } from 'lucide-react';

interface UsageSummary {
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    totalRequests: number;
    period: string;
}

interface LogEntry {
    id: string;
    feature: string;
    tokens: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    model: string;
    userId: string;
    createdAt: string;
}

export default function AdminUsagePage() {
    const [summary, setSummary] = useState<UsageSummary | null>(null);
    const [grouped, setGrouped] = useState<Record<string, { tokens: number; cost: number; count: number }>>({});
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [daily, setDaily] = useState<{ date: string; tokens: number; cost: number; count: number }[]>([]);
    const [period, setPeriod] = useState('30d');
    const [groupBy, setGroupBy] = useState('feature');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/usage?period=${period}&groupBy=${groupBy}`)
            .then(r => r.json())
            .then(data => {
                setSummary(data.summary);
                setGrouped(data.grouped || {});
                setLogs(data.recentLogs || []);
                setDaily(data.daily || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [period, groupBy]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Usage Analytics</h1>
                    <p className="text-muted-foreground mt-2">Deep-dive into AI token usage and costs.</p>
                </div>
                <div className="flex gap-2">
                    {['7d', '30d', 'all'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                period === p ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                            }`}
                        >
                            {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.totalTokens.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">
                                In: {summary.totalInputTokens.toLocaleString()} | Out: {summary.totalOutputTokens.toLocaleString()}
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                            <DollarSign className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-primary">${summary.totalCost.toFixed(4)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.totalRequests.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Cost/Call</CardTitle>
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ${summary.totalRequests > 0 ? (summary.totalCost / summary.totalRequests).toFixed(6) : '0.00'}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Group By Selector + Breakdown */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Breakdown</CardTitle>
                    <div className="flex gap-1">
                        {['feature', 'model', 'user'].map((g) => (
                            <button
                                key={g}
                                onClick={() => setGroupBy(g)}
                                className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                                    groupBy === g ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                                }`}
                            >
                                By {g}
                            </button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(grouped)
                                .sort(([, a], [, b]) => b.cost - a.cost)
                                .map(([key, stats]) => {
                                    const maxCost = Math.max(...Object.values(grouped).map(g => g.cost));
                                    const barWidth = maxCost > 0 ? (stats.cost / maxCost) * 100 : 0;
                                    return (
                                        <div key={key} className="flex items-center gap-4">
                                            <span className="text-sm font-medium w-32 truncate capitalize">{key.replace(/-/g, ' ')}</span>
                                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                                                <div
                                                    className="h-full bg-primary/30 rounded-full transition-all"
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                                <span className="absolute inset-0 flex items-center px-3 text-xs font-mono">
                                                    {stats.tokens.toLocaleString()} tokens
                                                </span>
                                            </div>
                                            <span className="text-sm font-mono w-24 text-right">${stats.cost.toFixed(6)}</span>
                                            <span className="text-xs text-muted-foreground w-16 text-right">{stats.count} calls</span>
                                        </div>
                                    );
                                })}
                            {Object.keys(grouped).length === 0 && (
                                <p className="text-sm text-muted-foreground">No data for this period.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent API Calls</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                <tr>
                                    <th className="px-3 py-2">Feature</th>
                                    <th className="px-3 py-2">Model</th>
                                    <th className="px-3 py-2 text-right">Input</th>
                                    <th className="px-3 py-2 text-right">Output</th>
                                    <th className="px-3 py-2 text-right">Cost</th>
                                    <th className="px-3 py-2">User</th>
                                    <th className="px-3 py-2">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-3 py-2 capitalize">{log.feature?.replace(/-/g, ' ')}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{log.model || '—'}</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs">{(log.inputTokens || 0).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs">{(log.outputTokens || 0).toLocaleString()}</td>
                                        <td className="px-3 py-2 text-right font-mono text-xs">${(log.cost || 0).toFixed(6)}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{log.userId}</td>
                                        <td className="px-3 py-2 text-xs text-muted-foreground">
                                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                                            No usage logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
