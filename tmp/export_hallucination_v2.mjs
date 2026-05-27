import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const SUPABASE_URL = 'https://gupnphrvbgkrftgwhuvf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cG5waHJ2YmdrcmZ0Z3dodXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNzQyMiwiZXhwIjoyMDg3ODAzNDIyfQ.J_-ou8qJkJP9OrsYV2q6hvMtKueUVT7WklkIwiHQOPA';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function toCSV(rows, headers) {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const val = row[h] ?? '';
      const s = String(val).replace(/"/g, '""');
      return (s.includes(',') || s.includes('\n') || s.includes('"')) ? `"${s}"` : s;
    }).join(','));
  }
  return lines.join('\n');
}

// ── Inspect one itinerary deeply so we know what keys to use ─────────────────
function analyzeContent(content) {
  const str = JSON.stringify(content || '');
  const strLow = str.toLowerCase();

  // --- Key content keys present ---
  const hasTitle = !!content?.title;
  const hasOverview = !!content?.overview;
  const hasWhyThisPlan = !!content?.whyThisPlan;
  const hasBudgetBreakdown = !!content?.budgetBreakdown;
  const hasDays = Array.isArray(content?.days);

  // Day plan completeness
  const rawDays = content?.days;
  const dayArr = Array.isArray(rawDays) ? rawDays : [];
  const numDays = dayArr.length;

  // Per-day depth: check if days have activities
  let totalActivities = 0;
  let daysWithActivities = 0;
  let namedSpecificVenues = new Set();
  let genericPhraseCount = 0;

  const GENERIC_PHRASES = [
    'local restaurant', 'a restaurant', 'nearby', 'some food',
    'popular attraction', 'famous landmark', 'a museum', 'a park',
    'various', 'several', 'a hotel', 'a hostel', 'the hotel',
    'a local', 'some local', 'local area', 'city center', 'central area'
  ];

  for (const day of dayArr) {
    const dayStr = JSON.stringify(day).toLowerCase();
    const acts = day.activities || day.activity || day.schedule || day.places || [];
    if (Array.isArray(acts) && acts.length > 0) {
      daysWithActivities++;
      totalActivities += acts.length;

      // Extract specific venue names from activities
      for (const act of acts) {
        const name = act.name || act.place || act.title || act.venue || '';
        if (name && name.length > 3) namedSpecificVenues.add(name.toLowerCase().trim());
      }
    } else if (day.morning || day.afternoon || day.evening) {
      daysWithActivities++;
    }

    // Count generic phrases
    genericPhraseCount += GENERIC_PHRASES.filter(p => dayStr.includes(p)).length;
  }

  // Check for placeResearch (signals grounding from Google Places API)
  const hasPlaceResearch = strLow.includes('placeresearch') || strLow.includes('place_research');

  // Check for budgetBreakdown specificity
  let budgetSpecific = false;
  if (content?.budgetBreakdown && typeof content.budgetBreakdown === 'object') {
    const budgetVals = Object.values(content.budgetBreakdown);
    budgetSpecific = budgetVals.some(v => typeof v === 'number' && v > 0);
  }

  // Content richness
  const contentChars = str.length;

  // Hallucination risk signals
  let halluScore = 0;
  const signals = [];

  // --- Bad signals ---
  if (genericPhraseCount > 0) {
    halluScore += Math.min(40, genericPhraseCount * 8);
    signals.push(`Generic phrases: ${genericPhraseCount}`);
  }
  if (!hasDays || numDays === 0) {
    halluScore += 25;
    signals.push('No day plans');
  }
  if (numDays > 0 && daysWithActivities < numDays) {
    const empty = numDays - daysWithActivities;
    halluScore += empty * 8;
    signals.push(`${empty}/${numDays} days have no activities`);
  }
  if (namedSpecificVenues.size < 3 && numDays > 0) {
    halluScore += 15;
    signals.push(`Only ${namedSpecificVenues.size} specific venues named`);
  }
  if (!hasBudgetBreakdown) {
    halluScore += 8;
    signals.push('No budget breakdown');
  }
  if (!budgetSpecific && hasBudgetBreakdown) {
    halluScore += 5;
    signals.push('Budget breakdown not quantified');
  }

  // --- Good signals (grounding / DGHP markers) ---
  if (hasPlaceResearch) {
    halluScore -= 20;
    signals.push('✓ Place research (Google Places)');
  }
  if (hasWhyThisPlan) {
    halluScore -= 5;
    signals.push('✓ Contextual narrative');
  }
  if (hasBudgetBreakdown && budgetSpecific) {
    halluScore -= 10;
    signals.push('✓ Specific budget figures');
  }
  if (namedSpecificVenues.size >= 5) {
    halluScore -= 10;
    signals.push(`✓ ${namedSpecificVenues.size} specific venues named`);
  }
  if (contentChars > 6000) {
    halluScore -= 8;
    signals.push(`✓ Rich content (${contentChars} chars)`);
  }

  halluScore = Math.max(0, Math.min(100, halluScore));
  const level = halluScore <= 15 ? 'LOW'
              : halluScore <= 35 ? 'MODERATE'
              : halluScore <= 60 ? 'HIGH'
              : 'VERY HIGH';

  return {
    hasTitle, hasOverview, hasWhyThisPlan, hasBudgetBreakdown,
    hasDays, numDays, daysWithActivities, totalActivities,
    specificVenueCount: namedSpecificVenues.size,
    genericPhraseCount,
    hasPlaceResearch,
    budgetSpecific,
    contentChars,
    halluScore,
    level,
    signals: signals.join(' | ')
  };
}

async function main() {
  // Get itinerary usage logs
  const { data: usageLogs } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .in('feature_type', ['itinerary', 'agent_itinerary'])
    .order('created_at', { ascending: true });

  // Get all itineraries
  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('*')
    .order('created_at', { ascending: true });

  console.log(`Logs: ${usageLogs?.length}, Itineraries: ${itineraries?.length}`);

  // ── Build usage log index by approximate time for matching ───────────────
  const logsByTime = {};
  for (const log of (usageLogs || [])) {
    logsByTime[log.id] = log;
  }

  // ── Detect pipeline version from request_data ────────────────────────────
  // Logs WITH placeResearch in request_data = v2 (grounded)
  // Logs WITHOUT placeResearch = v1 (basic LLM)
  // feature_type = 'agent_itinerary' = v3 (DGHP)

  function getPipelineVersion(log) {
    if (!log) return 'v1_basic_llm';
    if (log.feature_type === 'agent_itinerary') return 'v3_dghp_agent';
    if (log.request_data?.placeResearch) return 'v2_grounded';
    return 'v1_basic_llm';
  }

  // ─── CSV 1: itinerary_usage_logs.csv ─────────────────────────────────────
  const usageRows = [];
  for (let i = 0; i < (usageLogs || []).length; i++) {
    const log = usageLogs[i];
    const pipelineVersion = getPipelineVersion(log);
    const { halluScore, level, signals } = analyzeContent(log.request_data);

    usageRows.push({
      row_num: i + 1,
      log_id: log.id,
      created_at: log.created_at,
      feature_type: log.feature_type,
      pipeline_version: pipelineVersion,
      pipeline_label: pipelineVersion === 'v1_basic_llm' ? 'v1 – Basic LLM (No Grounding)'
                    : pipelineVersion === 'v2_grounded' ? 'v2 – Grounded (Google Places)'
                    : 'v3 – DGHP Agent Pipeline',
      tokens_used: log.tokens_used || 0,
      cost_usd: parseFloat(log.cost_estimate || 0).toFixed(6),
      destination: log.request_data?.city || 'N/A',
      days_requested: log.request_data?.days || 'N/A',
      budget: log.request_data?.budget || 'N/A',
      has_place_research: !!log.request_data?.placeResearch ? 'YES' : 'NO',
    });
  }

  writeFileSync('./tmp/itinerary_usage_logs.csv', toCSV(usageRows, Object.keys(usageRows[0] || {})));
  console.log('✅ Saved: tmp/itinerary_usage_logs.csv');

  // ─── CSV 2: hallucination_comparison.csv (main thesis file) ──────────────
  const halluRows = [];
  for (let i = 0; i < (itineraries || []).length; i++) {
    const itn = itineraries[i];
    const a = analyzeContent(itn.content);

    // Find best matching log
    const matchLog = (usageLogs || []).find(l => {
      const dest = String(l.request_data?.city || '').toLowerCase();
      const cityId = String(itn.city_id || '').toLowerCase();
      return dest && cityId && (cityId.includes(dest) || dest.includes(cityId));
    });
    const pipelineVersion = getPipelineVersion(matchLog);

    halluRows.push({
      row_num: i + 1,
      itinerary_id: itn.id,
      created_at: itn.created_at,
      destination_city_id: itn.city_id || 'custom/unknown',
      title: (itn.title || '').replace(/,/g, ';'),
      days_generated: itn.days || a.numDays || 'N/A',
      budget: itn.budget || 'N/A',
      travel_style: itn.travel_style || 'N/A',

      // Pipeline classification
      pipeline_version: pipelineVersion,
      pipeline_label: pipelineVersion === 'v1_basic_llm' ? 'v1 – Basic LLM (No Grounding)'
                    : pipelineVersion === 'v2_grounded' ? 'v2 – Grounded (Google Places)'
                    : 'v3 – DGHP Agent Pipeline',

      // ── Hallucination metrics ─────────────────────────────────────────────
      hallucination_risk_score: a.halluScore,    // 0=best, 100=worst
      hallucination_risk_level: a.level,          // LOW / MODERATE / HIGH / VERY HIGH
      hallucination_signals: a.signals,

      // ── Content quality dimensions ────────────────────────────────────────
      has_title: a.hasTitle ? 'YES' : 'NO',
      has_overview: a.hasOverview ? 'YES' : 'NO',
      has_why_this_plan: a.hasWhyThisPlan ? 'YES' : 'NO',
      has_budget_breakdown: a.hasBudgetBreakdown ? 'YES' : 'NO',
      budget_is_quantified: a.budgetSpecific ? 'YES' : 'NO',
      has_google_places_grounding: a.hasPlaceResearch ? 'YES' : 'NO',
      day_plans_count: a.numDays,
      days_with_activities: a.daysWithActivities,
      total_activities: a.totalActivities,
      specific_venues_named: a.specificVenueCount,
      generic_phrase_count: a.genericPhraseCount,
      content_size_chars: a.contentChars,

      // Cost
      tokens_used: matchLog?.tokens_used || 'N/A',
      cost_usd: matchLog ? parseFloat(matchLog.cost_estimate || 0).toFixed(6) : 'N/A',
    });
  }

  writeFileSync('./tmp/hallucination_comparison.csv', toCSV(halluRows, Object.keys(halluRows[0] || {})));
  console.log('✅ Saved: tmp/hallucination_comparison.csv');

  // ─── CSV 3: Phase summary for thesis table ─────────────────────────────────
  const phases = ['v1_basic_llm', 'v2_grounded', 'v3_dghp_agent'];
  const summaryRows = [];

  for (const phase of phases) {
    const rows = halluRows.filter(r => r.pipeline_version === phase);
    if (rows.length === 0) continue;

    const n = rows.length;
    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 'N/A';

    const scores = rows.map(r => r.hallucination_risk_score);
    const named = rows.map(r => r.specific_venues_named);
    const activities = rows.map(r => r.total_activities);
    const generic = rows.map(r => r.generic_phrase_count);
    const chars = rows.map(r => r.content_size_chars);

    const highRisk = rows.filter(r => r.hallucination_risk_level === 'HIGH' || r.hallucination_risk_level === 'VERY HIGH').length;
    const lowRisk = rows.filter(r => r.hallucination_risk_level === 'LOW').length;
    const grounded = rows.filter(r => r.has_google_places_grounding === 'YES').length;

    summaryRows.push({
      pipeline_version: phase,
      pipeline_label: rows[0].pipeline_label,
      sample_count: n,
      avg_hallucination_score: avg(scores),
      min_hallucination_score: Math.min(...scores),
      max_hallucination_score: Math.max(...scores),
      high_or_very_high_risk_count: highRisk,
      high_or_very_high_risk_pct: ((highRisk / n) * 100).toFixed(1) + '%',
      low_risk_count: lowRisk,
      low_risk_pct: ((lowRisk / n) * 100).toFixed(1) + '%',
      avg_specific_venues: avg(named),
      avg_activities_per_itinerary: avg(activities),
      avg_generic_phrase_count: avg(generic),
      avg_content_chars: avg(chars),
      google_places_grounded: grounded + '/' + n,
    });
  }

  writeFileSync('./tmp/hallucination_phase_summary.csv', toCSV(summaryRows, Object.keys(summaryRows[0] || {})));
  console.log('✅ Saved: tmp/hallucination_phase_summary.csv');

  // ─── Print thesis table ───────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║    THESIS EVIDENCE: Hallucination Reduction by Pipeline Phase ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  for (const s of summaryRows) {
    console.log(`▶ ${s.pipeline_label}`);
    console.log(`  Samples:                  ${s.sample_count}`);
    console.log(`  Avg Hallucination Score:  ${s.avg_hallucination_score}/100 (lower = better)`);
    console.log(`  High/Very High Risk:       ${s.high_or_very_high_risk_count} (${s.high_or_very_high_risk_pct})`);
    console.log(`  Low Risk:                  ${s.low_risk_count} (${s.low_risk_pct})`);
    console.log(`  Avg Specific Venues:       ${s.avg_specific_venues}`);
    console.log(`  Avg Activities:            ${s.avg_activities_per_itinerary}`);
    console.log(`  Avg Generic Phrases:       ${s.avg_generic_phrase_count}`);
    console.log(`  Google Places Grounded:    ${s.google_places_grounded}\n`);
  }

  // ─── Print actual sample itinerary keys for verification ─────────────────
  console.log('-- Sample full content inspection --');
  for (const itn of (itineraries || []).slice(0, 3)) {
    const keys = Object.keys(itn.content || {});
    const dayArr = itn.content?.days || [];
    const day1 = dayArr[0] || {};
    const day1Keys = Object.keys(day1);
    const acts = day1.activities || day1.activity || [];
    const act1 = acts[0] || {};
    console.log(`\n[${itn.city_id || 'unknown'}] ${itn.title}`);
    console.log(`  content keys: ${keys.join(', ')}`);
    console.log(`  day[0] keys: ${day1Keys.join(', ')}`);
    console.log(`  activity[0] keys: ${Object.keys(act1).join(', ')}`);
    if (act1.name) console.log(`  activity[0].name: "${act1.name}"`);
  }
}

main().catch(console.error);
