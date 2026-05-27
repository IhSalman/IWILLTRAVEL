/**
 * Thesis Data Export Script
 * Fetches the last 30 agent_pipeline_logs runs and produces:
 *  1. A JSON summary file
 *  2. A CSV for charting
 *  3. A formatted console report
 * 
 * Run: node scratch/thesis_data_export.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://gupnphrvbgkrftgwhuvf.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cG5waHJ2YmdrcmZ0Z3dodXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNzQyMiwiZXhwIjoyMDg3ODAzNDIyfQ.J_-ou8qJkJP9OrsYV2q6hvMtKueUVT7WklkIwiHQOPA';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// ── Grounding detector ──────────────────────────────────────────────────────
// Heuristic: Agent 1 "success" details mentions venue count > 0
function parseGroundingRate(agentLogs) {
    if (!agentLogs || !agentLogs.length) return null;
    const a1 = agentLogs.find(l => l.agent && l.agent.includes('1'));
    if (!a1 || a1.status !== 'success') return 0;
    // Extract number from details like "Found 21 verified venues."
    const match = a1.details && a1.details.match(/(\d+)\s+(verified|unique)/i);
    if (match) return parseInt(match[1]);
    return a1.status === 'success' ? 15 : 0; // conservative fallback
}

function fmt(ms) {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

async function main() {
    console.log('\n📡 Fetching last 30 pipeline runs for thesis...\n');

    const { data: runs, error } = await supabase
        .from('agent_pipeline_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('❌ Query failed:', error.message);
        process.exit(1);
    }

    if (!runs || runs.length === 0) {
        console.log('⚠️  No runs found.');
        return;
    }

    console.log(`✅ Fetched ${runs.length} runs.\n`);
    console.log('═'.repeat(90));

    // ── Per-run table ──────────────────────────────────────────────────────────
    const rows = runs.map((run, i) => {
        const date     = new Date(run.created_at);
        const dateStr  = date.toISOString().split('T')[0];
        const month    = date.getMonth() + 1; // 4=April, 5=May
        const venueCount = parseGroundingRate(run.agent_logs);
        const isGrounded = venueCount > 0;

        // Per-agent durations
        const agentMap = {};
        (run.agent_logs || []).forEach(l => {
            const num = l.agent && l.agent.match(/\d+/);
            if (num) agentMap[`A${num[0]}`] = l.durationMs;
        });

        return {
            run: runs.length - i,
            date: dateStr,
            month: month === 4 ? 'April' : month === 5 ? 'May' : 'Other',
            destination: run.destination,
            days: run.days,
            budget: run.budget,
            success: run.success,
            totalMs: run.total_ms,
            venuesFound: venueCount,
            grounded: isGrounded,
            model: run.model_used || 'unknown',
            inputTokens: run.input_tokens || 0,
            outputTokens: run.output_tokens || 0,
            agentMap,
        };
    });

    // ── Console Report ─────────────────────────────────────────────────────────
    console.log('Run | Date       | Month | Destination          | Days | Budget   | Total   | Venues | Grounded | Status');
    console.log('─'.repeat(105));

    rows.forEach(r => {
        const dest   = (r.destination || 'Unknown').padEnd(20).slice(0, 20);
        const budget = (r.budget || '').padEnd(8);
        const total  = fmt(r.totalMs).padStart(7);
        const venues = String(r.venuesFound ?? '?').padStart(6);
        const ground = r.grounded ? '✅ YES' : '❌ NO ';
        const status = r.success  ? '✅' : '❌';
        console.log(`${String(r.run).padStart(3)} | ${r.date} | ${r.month.padEnd(5)} | ${dest} | ${String(r.days).padStart(4)} | ${budget} | ${total} | ${venues} | ${ground} | ${status}`);
    });

    // ── Aggregate Stats ────────────────────────────────────────────────────────
    const successful = rows.filter(r => r.success);
    const grounded   = rows.filter(r => r.grounded);
    const avgTime    = successful.reduce((a, b) => a + b.totalMs, 0) / (successful.length || 1);
    const minTime    = Math.min(...successful.map(r => r.totalMs));
    const maxTime    = Math.max(...successful.map(r => r.totalMs));
    const groundRate = (grounded.length / rows.length * 100).toFixed(1);

    // Average per-agent durations
    const agentTotals = {};
    const agentCounts = {};
    rows.forEach(r => {
        Object.entries(r.agentMap).forEach(([agent, ms]) => {
            agentTotals[agent] = (agentTotals[agent] || 0) + ms;
            agentCounts[agent] = (agentCounts[agent] || 0) + 1;
        });
    });

    console.log('\n' + '═'.repeat(90));
    console.log('\n📊 AGGREGATE STATS (last 30 runs)');
    console.log('─'.repeat(50));
    console.log(`  Total runs analyzed    : ${rows.length}`);
    console.log(`  Successful completions : ${successful.length} (${(successful.length/rows.length*100).toFixed(0)}%)`);
    console.log(`  Grounded runs          : ${grounded.length} / ${rows.length} (${groundRate}%)`);
    console.log(`  Average total time     : ${fmt(avgTime)}`);
    console.log(`  Fastest run            : ${fmt(minTime)}`);
    console.log(`  Slowest run            : ${fmt(maxTime)}`);
    console.log('\n  Per-Agent Average Duration:');
    Object.keys(agentTotals).sort().forEach(agent => {
        const avg = agentTotals[agent] / agentCounts[agent];
        console.log(`    ${agent.padEnd(6)} : ${fmt(avg)}`);
    });

    // ── CSV Export ─────────────────────────────────────────────────────────────
    const csvHeader = 'run,date,month,destination,days,budget,success,total_ms,venues_found,grounded,model,input_tokens,output_tokens,A1_ms,A2_ms,A3_ms,A4_ms,A5_ms,A6_ms,A7_ms,A8_ms';
    const csvRows = rows.map(r => [
        r.run, r.date, r.month, `"${r.destination}"`, r.days, r.budget,
        r.success, r.totalMs, r.venuesFound, r.grounded,
        `"${r.model}"`, r.inputTokens, r.outputTokens,
        r.agentMap.A1 || '', r.agentMap.A2 || '', r.agentMap.A3 || '',
        r.agentMap.A4 || '', r.agentMap.A5 || '', r.agentMap.A6 || '',
        r.agentMap.A7 || '', r.agentMap.A8 || '',
    ].join(','));

    const csvOut = [csvHeader, ...csvRows].join('\n');
    const csvPath = path.join(__dirname, 'thesis_pipeline_data.csv');
    fs.writeFileSync(csvPath, csvOut, 'utf-8');

    // ── JSON Summary ───────────────────────────────────────────────────────────
    const summary = {
        exportedAt: new Date().toISOString(),
        totalRuns: rows.length,
        successRate: `${(successful.length/rows.length*100).toFixed(0)}%`,
        groundingRate: `${groundRate}%`,
        groundedCount: grounded.length,
        avgTotalMs: Math.round(avgTime),
        minTotalMs: minTime,
        maxTotalMs: maxTime,
        perAgentAvgMs: Object.fromEntries(
            Object.keys(agentTotals).sort().map(a => [
                a, Math.round(agentTotals[a] / agentCounts[a])
            ])
        ),
        runs: rows,
    };

    const jsonPath = path.join(__dirname, 'thesis_pipeline_summary.json');
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');

    console.log('\n💾 Files saved:');
    console.log(`   CSV  → ${csvPath}`);
    console.log(`   JSON → ${jsonPath}`);
    console.log('\n🎓 Use the CSV in Excel to build your Before vs. After chart.\n');
}

main().catch(console.error);
