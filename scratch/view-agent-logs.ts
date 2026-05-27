/**
 * Agent Pipeline Log Viewer
 * 
 * Queries the `agent_pipeline_logs` table and prints a formatted
 * summary for thesis benchmarking.
 *
 * Run from project root:
 *   npx ts-node --project tsconfig.json scratch/view-agent-logs.ts
 *   -- OR (if ts-node isn't available) --
 *   npx tsx scratch/view-agent-logs.ts
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ──────────────────────────────────────────────────────────────────
// Copy from your .env.local
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || '';
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌  Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your env.\n' +
        '    Tip: run with:  npx tsx scratch/view-agent-logs.ts\n' +
        '    after copying your .env.local values into the shell:\n' +
        '    $env:NEXT_PUBLIC_SUPABASE_URL="https://..."  (PowerShell)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentLog {
    agent: string;
    durationMs: number;
    status: 'success' | 'error' | 'skipped' | string;
    details?: string;
    timestamp: string;
}

interface PipelineRun {
    id: string;
    created_at: string;
    user_id: string | null;
    destination: string;
    days: number;
    budget: string;
    travel_style: string;
    total_ms: number;
    success: boolean;
    error_message: string | null;
    agent_logs: AgentLog[];
    input_tokens: number;
    output_tokens: number;
    model_used: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const bar = (ms: number, maxMs: number, width = 30): string => {
    const filled = Math.round((ms / maxMs) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
};

const fmt = (ms: number): string =>
    ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

const statusIcon = (s: string): string =>
    s === 'success' ? '✅' : s === 'error' ? '❌' : '⚠️ ';

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n📡  Fetching agent pipeline logs from Supabase...\n');

    const { data: runs, error } = await supabase
        .from('agent_pipeline_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('❌  Query failed:', error.message);
        process.exit(1);
    }

    if (!runs || runs.length === 0) {
        console.log('⚠️   No pipeline runs found yet. Generate an itinerary first, then re-run this script.');
        return;
    }

    console.log(`Found ${runs.length} pipeline run(s).\n`);
    console.log('═'.repeat(80));

    for (const run of runs as PipelineRun[]) {
        const date = new Date(run.created_at).toLocaleString();
        const icon = run.success ? '✅' : '❌';

        console.log(`\n${icon}  Run: ${run.destination}  |  ${run.days} days  |  ${date}`);
        console.log(`    User: ${run.user_id ?? 'guest'}  |  Model: ${run.model_used}  |  Total: ${fmt(run.total_ms)}`);
        if (run.error_message) console.log(`    Error: ${run.error_message}`);
        console.log(`    Tokens: ${run.input_tokens.toLocaleString()} in + ${run.output_tokens.toLocaleString()} out`);

        if (run.agent_logs?.length) {
            const maxMs = Math.max(...run.agent_logs.map(l => l.durationMs), 1);
            console.log('\n    Agent Breakdown:');
            console.log('    ' + '─'.repeat(72));
            for (const log of run.agent_logs) {
                const icon2 = statusIcon(log.status);
                const b = bar(log.durationMs, maxMs, 25);
                const duration = fmt(log.durationMs).padStart(6);
                const name = log.agent.padEnd(28);
                console.log(`    ${icon2}  ${name} ${b}  ${duration}  ${log.details ?? ''}`);
            }
        }
        console.log('\n' + '═'.repeat(80));
    }

    // ── Aggregate Stats ────────────────────────────────────────────────────────
    const successful = (runs as PipelineRun[]).filter(r => r.success);
    if (successful.length > 1) {
        const totalMs = successful.map(r => r.total_ms);
        const avgMs   = totalMs.reduce((a, b) => a + b, 0) / totalMs.length;
        const minMs   = Math.min(...totalMs);
        const maxMs   = Math.max(...totalMs);

        // Per-agent averages
        const agentSums: Record<string, number[]> = {};
        for (const run of successful) {
            for (const log of run.agent_logs ?? []) {
                if (!agentSums[log.agent]) agentSums[log.agent] = [];
                agentSums[log.agent].push(log.durationMs);
            }
        }

        console.log('\n📊  Aggregate Stats across', successful.length, 'successful runs');
        console.log('─'.repeat(50));
        console.log(`  Average total time : ${fmt(avgMs)}`);
        console.log(`  Fastest run        : ${fmt(minMs)}`);
        console.log(`  Slowest run        : ${fmt(maxMs)}`);
        console.log('\n  Per-Agent Averages:');
        for (const [agent, times] of Object.entries(agentSums)) {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            console.log(`  ${agent.padEnd(32)} avg ${fmt(avg)}`);
        }
    }

    // ── CSV Export ─────────────────────────────────────────────────────────────
    const csvLines: string[] = [
        'run_id,created_at,destination,days,budget,model,total_ms,success,agent,agent_ms,agent_status'
    ];
    for (const run of runs as PipelineRun[]) {
        for (const log of run.agent_logs ?? []) {
            csvLines.push([
                run.id, run.created_at, run.destination, run.days,
                run.budget, run.model_used, run.total_ms, run.success,
                `"${log.agent}"`, log.durationMs, log.status
            ].join(','));
        }
    }

    const fs = await import('fs');
    const path = await import('path');
    const outPath = path.join(process.cwd(), 'scratch', 'agent_logs_export.csv');
    fs.writeFileSync(outPath, csvLines.join('\n'), 'utf-8');
    console.log(`\n💾  CSV exported to: ${outPath}`);
    console.log('    Use this CSV in Excel / Python / Tableau for your thesis charts.\n');
}

main().catch(console.error);
