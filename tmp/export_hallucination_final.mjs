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

// Real hallucination scoring based on actual DB content structure
function analyzeItinerary(itn) {
  const content = itn.content || {};
  const str = JSON.stringify(content);
  const dayArr = Array.isArray(content.days) ? content.days : [];
  const numDays = dayArr.length;

  // ── Schema version detection ────────────────────────────────────────────
  // V1 schema: only {days, title}
  // V2 schema: {days, title, overview, whyThisPlan, budgetBreakdown}
  const topKeys = Object.keys(content);
  const hasOverview = !!content.overview;
  const hasWhyThisPlan = !!content.whyThisPlan;
  const hasBudgetBreakdown = !!content.budgetBreakdown;
  const hasTheme = dayArr.some(d => d.theme);

  // Activity richness
  let totalActivities = 0;
  let activitiesWithCost = 0;
  let activitiesWithDuration = 0;
  let activitiesWithTip = 0;
  let activitiesWithDescription = 0;
  let venueNames = new Set();
  let genericCount = 0;

  const GENERIC = [
    'local restaurant', 'a restaurant', 'nearby', 'a museum', 'a park',
    'popular attraction', 'famous landmark', 'various', 'a hotel', 'the hotel',
    'city center', 'central area', 'some food', 'a local'
  ];

  for (const day of dayArr) {
    const acts = Array.isArray(day.activities) ? day.activities : [];
    for (const act of acts) {
      totalActivities++;
      if (act.cost !== undefined && act.cost !== null) activitiesWithCost++;
      if (act.duration) activitiesWithDuration++;
      if (act.tip) activitiesWithTip++;
      if (act.description) activitiesWithDescription++;
      const name = act.title || act.name || '';
      if (name.length > 3) venueNames.add(name.trim());
    }
    const dayStr = JSON.stringify(day).toLowerCase();
    genericCount += GENERIC.filter(g => dayStr.includes(g)).length;
  }

  // Budget breakdown value
  let budgetTotal = 0;
  if (content.budgetBreakdown && typeof content.budgetBreakdown === 'object') {
    const vals = Object.values(content.budgetBreakdown);
    budgetTotal = vals.filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
  }

  // ── Pipeline version ────────────────────────────────────────────────────
  // V1 = only days+title, no overview
  // V2 = has overview/whyThisPlan/budgetBreakdown (structured schema update)
  // V2+ = also has theme per day + tip + duration + cost on activities
  let pipelineVersion, pipelineLabel;
  if (!hasOverview && !hasWhyThisPlan && !hasBudgetBreakdown) {
    pipelineVersion = 'v1_basic_llm';
    pipelineLabel = 'v1 – Basic LLM (Unstructured)';
  } else if (hasOverview && hasWhyThisPlan && hasBudgetBreakdown && !hasTheme) {
    pipelineVersion = 'v2_structured';
    pipelineLabel = 'v2 – Structured Schema (No Day Themes)';
  } else if (hasTheme && activitiesWithCost > 0) {
    pipelineVersion = 'v3_dghp';
    pipelineLabel = 'v3 – DGHP (Themes + Cost + Tips)';
  } else {
    pipelineVersion = 'v2_structured';
    pipelineLabel = 'v2 – Structured Schema';
  }

  // ── Hallucination risk score ────────────────────────────────────────────
  let halluScore = 50; // start neutral
  const halluSignals = [];

  // Negative signals (RAISE score = more hallucination risk)
  if (!hasOverview) { halluScore += 15; halluSignals.push('No overview'); }
  if (!hasWhyThisPlan) { halluScore += 10; halluSignals.push('No reasoning'); }
  if (!hasBudgetBreakdown) { halluScore += 12; halluSignals.push('No budget data'); }
  if (!hasTheme) { halluScore += 8; halluSignals.push('No day themes'); }
  if (numDays === 0) { halluScore += 20; halluSignals.push('No day plans'); }
  if (totalActivities === 0) { halluScore += 15; halluSignals.push('No activities'); }
  if (genericCount > 2) { halluScore += Math.min(20, genericCount * 4); halluSignals.push(`Generic phrases: ${genericCount}`); }
  if (venueNames.size < 3 && numDays > 0) { halluScore += 12; halluSignals.push(`Only ${venueNames.size} named venues`); }
  if (activitiesWithCost === 0 && totalActivities > 0) { halluScore += 8; halluSignals.push('No cost estimates'); }

  // Positive signals (REDUCE score = less hallucination risk)
  if (hasOverview) { halluScore -= 15; halluSignals.push('✓ Overview present'); }
  if (hasWhyThisPlan) { halluScore -= 10; halluSignals.push('✓ Reasoning present'); }
  if (hasBudgetBreakdown && budgetTotal > 0) { halluScore -= 12; halluSignals.push(`✓ Budget: $${budgetTotal}`); }
  if (hasTheme) { halluScore -= 8; halluSignals.push('✓ Day themes'); }
  if (activitiesWithTip > 0) { halluScore -= 8; halluSignals.push(`✓ ${activitiesWithTip} practical tips`); }
  if (activitiesWithDuration > 0) { halluScore -= 6; halluSignals.push('✓ Duration data'); }
  if (venueNames.size >= 5) { halluScore -= 10; halluSignals.push(`✓ ${venueNames.size} specific venues`); }
  if (activitiesWithDescription >= 3) { halluScore -= 8; halluSignals.push('✓ Activity descriptions'); }
  if (str.length > 7000) { halluScore -= 8; halluSignals.push(`✓ Rich content (${str.length} chars)`); }

  halluScore = Math.max(0, Math.min(100, halluScore));
  const halluLevel = halluScore <= 20 ? 'LOW'
                   : halluScore <= 40 ? 'MODERATE'
                   : halluScore <= 60 ? 'HIGH'
                   : 'VERY HIGH';

  return {
    pipelineVersion, pipelineLabel,
    hasOverview, hasWhyThisPlan, hasBudgetBreakdown, hasTheme,
    numDays, totalActivities,
    activitiesWithCost, activitiesWithDuration, activitiesWithTip, activitiesWithDescription,
    specificVenueCount: venueNames.size,
    genericPhraseCount: genericCount,
    budgetTotal,
    contentChars: str.length,
    halluScore, halluLevel,
    halluSignals: halluSignals.join(' | '),
    schemaFields: topKeys.join('+'),
    activityFields: dayArr[0]?.activities?.[0] ? Object.keys(dayArr[0].activities[0]).join('+') : 'N/A',
  };
}

async function main() {
  const { data: usageLogs } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .in('feature_type', ['itinerary', 'agent_itinerary'])
    .order('created_at', { ascending: true });

  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('*')
    .order('created_at', { ascending: true });

  console.log(`Logs: ${usageLogs?.length}, Itineraries: ${itineraries?.length}\n`);

  // Build a lookup: match logs to itineraries by destination city
  const usedLogIds = new Set();
  function findLog(itn) {
    // Try to match by city_id to log's city
    for (const log of (usageLogs || [])) {
      if (usedLogIds.has(log.id)) continue;
      const dest = String(log.request_data?.city || '').toLowerCase().replace(/\s+/g, '-');
      const cityId = String(itn.city_id || '').toLowerCase();
      if (dest && cityId && (cityId === dest || cityId.includes(dest) || dest.includes(cityId))) {
        usedLogIds.add(log.id);
        return log;
      }
    }
    return null;
  }

  // ─── CSV: hallucination_comparison.csv ────────────────────────────────────
  const rows = [];
  for (let i = 0; i < (itineraries || []).length; i++) {
    const itn = itineraries[i];
    const a = analyzeItinerary(itn);
    const log = findLog(itn);

    rows.push({
      // Identification
      row_num: i + 1,
      itinerary_id: itn.id.substring(0, 8) + '...',
      created_at: new Date(itn.created_at).toISOString().split('T')[0],  // date only
      destination: itn.city_id || 'unknown',
      title: (itn.title || '').replace(/,/g, ';').substring(0, 60),
      days_param: itn.days || 'N/A',
      budget_param: itn.budget || 'N/A',

      // Pipeline classification (THIS IS THE BEFORE/AFTER)
      pipeline_version: a.pipelineVersion,
      pipeline_label: a.pipelineLabel,

      // Schema completeness (structural hallucination proxies)
      schema_fields_present: a.schemaFields,
      has_overview: a.hasOverview ? 1 : 0,
      has_why_this_plan: a.hasWhyThisPlan ? 1 : 0,
      has_budget_breakdown: a.hasBudgetBreakdown ? 1 : 0,
      budget_total_usd: a.budgetTotal || 'N/A',
      has_day_themes: a.hasTheme ? 1 : 0,

      // Content depth metrics
      day_plans_count: a.numDays,
      total_activities: a.totalActivities,
      activities_with_cost: a.activitiesWithCost,
      activities_with_duration: a.activitiesWithDuration,
      activities_with_tips: a.activitiesWithTip,
      activities_with_description: a.activitiesWithDescription,
      specific_venues_named: a.specificVenueCount,
      generic_phrase_count: a.genericPhraseCount,
      content_size_chars: a.contentChars,
      activity_fields: a.activityFields,

      // Hallucination risk
      hallucination_score: a.halluScore,       // 0=best, 100=worst
      hallucination_level: a.halluLevel,
      hallucination_signals: a.halluSignals,

      // Cost data from usage log
      tokens_used: log?.tokens_used || 'N/A',
      cost_usd: log ? parseFloat(log.cost_estimate || 0).toFixed(6) : 'N/A',
      has_place_research_in_request: log?.request_data?.placeResearch ? 1 : 0,
    });
  }

  const headers = Object.keys(rows[0]);
  writeFileSync('./tmp/hallucination_comparison.csv', toCSV(rows, headers));
  console.log('✅ Saved: tmp/hallucination_comparison.csv');

  // ─── Phase summary CSV ─────────────────────────────────────────────────────
  const phaseOrder = ['v1_basic_llm', 'v2_structured', 'v3_dghp'];
  const phaseLabels = {
    v1_basic_llm: 'v1 – Basic LLM (Unstructured)',
    v2_structured: 'v2 – Structured Schema',
    v3_dghp:       'v3 – DGHP (Full Pipeline)',
  };

  const summaryRows = [];
  for (const phase of phaseOrder) {
    const pr = rows.filter(r => r.pipeline_version === phase);
    if (!pr.length) continue;
    const n = pr.length;
    const numAvg = key => (pr.reduce((s, r) => s + (Number(r[key]) || 0), 0) / n).toFixed(2);

    summaryRows.push({
      phase: phase,
      phase_label: phaseLabels[phase],
      n_itineraries: n,
      pct_of_total: ((n / rows.length) * 100).toFixed(1) + '%',

      // Hallucination risk
      avg_hallucination_score: numAvg('hallucination_score'),
      pct_low_risk:     ((pr.filter(r => r.hallucination_level === 'LOW').length / n) * 100).toFixed(1) + '%',
      pct_moderate_risk:((pr.filter(r => r.hallucination_level === 'MODERATE').length / n) * 100).toFixed(1) + '%',
      pct_high_risk:    ((pr.filter(r => r.hallucination_level === 'HIGH' || r.hallucination_level === 'VERY HIGH').length / n) * 100).toFixed(1) + '%',

      // Schema completeness
      pct_has_overview:        ((pr.filter(r => r.has_overview === 1).length / n) * 100).toFixed(1) + '%',
      pct_has_why_this_plan:   ((pr.filter(r => r.has_why_this_plan === 1).length / n) * 100).toFixed(1) + '%',
      pct_has_budget_breakdown:((pr.filter(r => r.has_budget_breakdown === 1).length / n) * 100).toFixed(1) + '%',
      pct_has_day_themes:      ((pr.filter(r => r.has_day_themes === 1).length / n) * 100).toFixed(1) + '%',

      // Content depth
      avg_day_plans: numAvg('day_plans_count'),
      avg_total_activities: numAvg('total_activities'),
      avg_specific_venues: numAvg('specific_venues_named'),
      avg_activities_with_cost: numAvg('activities_with_cost'),
      avg_activities_with_tips: numAvg('activities_with_tips'),
      avg_generic_phrases: numAvg('generic_phrase_count'),
      avg_content_chars: numAvg('content_size_chars'),
    });
  }

  writeFileSync('./tmp/hallucination_phase_summary.csv', toCSV(summaryRows, Object.keys(summaryRows[0] || {})));
  console.log('✅ Saved: tmp/hallucination_phase_summary.csv');

  // ─── Print thesis table ───────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  THESIS TABLE: Hallucination Reduction by Pipeline   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const cols = [
    'phase_label','n_itineraries','avg_hallucination_score',
    'pct_low_risk','pct_high_risk',
    'pct_has_overview','pct_has_budget_breakdown','pct_has_day_themes',
    'avg_specific_venues','avg_activities_with_tips','avg_generic_phrases'
  ];
  const colW = 30;
  console.log(cols.map(c => c.padEnd(colW)).join(''));
  console.log('-'.repeat(cols.length * colW));
  for (const s of summaryRows) {
    console.log(cols.map(c => String(s[c] ?? '').padEnd(colW)).join(''));
  }

  console.log('\n\n📊 KEY THESIS CLAIM NUMBERS:');
  if (summaryRows.length >= 1) {
    const v1 = summaryRows.find(s => s.phase === 'v1_basic_llm');
    const v2 = summaryRows.find(s => s.phase === 'v2_structured');
    const v3 = summaryRows.find(s => s.phase === 'v3_dghp');
    const latest = v3 || v2;
    if (v1 && latest) {
      const drop = (parseFloat(v1.avg_hallucination_score) - parseFloat(latest.avg_hallucination_score)).toFixed(1);
      console.log(`  Hallucination score dropped from ${v1.avg_hallucination_score} → ${latest.avg_hallucination_score} (−${drop} points)`);
    }
  }

  // Also check cost avg for itinerary feature types
  const costs = (usageLogs || []).map(l => parseFloat(l.cost_estimate || 0)).filter(c => c > 0);
  if (costs.length) {
    const avg = costs.reduce((a, b) => a + b) / costs.length;
    const v1Logs = (usageLogs || []).filter(l => !l.request_data?.placeResearch && l.feature_type === 'itinerary');
    const v2Logs = (usageLogs || []).filter(l => l.request_data?.placeResearch);
    const v3Logs = (usageLogs || []).filter(l => l.feature_type === 'agent_itinerary');
    const avg_ = arr => arr.length ? (arr.reduce((s, l) => s + parseFloat(l.cost_estimate || 0), 0) / arr.length).toFixed(6) : 'N/A';
    console.log(`\n  Cost per generation:`);
    console.log(`    v1 (basic itinerary): avg $${avg_(v1Logs)} (n=${v1Logs.length})`);
    console.log(`    v2 (with placeResearch): avg $${avg_(v2Logs)} (n=${v2Logs.length})`);
    console.log(`    v3 (agent_itinerary): avg $${avg_(v3Logs)} (n=${v3Logs.length})`);
    console.log(`    Overall avg: $${avg.toFixed(6)} (n=${costs.length})`);
  }
}

main().catch(console.error);
