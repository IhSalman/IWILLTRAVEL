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
      return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s}"` : s;
    }).join(','));
  }
  return lines.join('\n');
}

async function main() {
  console.log('=== Fetching AI Usage Logs ===');
  const { data: usageLogs, error: usageErr } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .order('created_at', { ascending: true });

  if (usageErr) {
    console.error('Error fetching ai_usage_logs:', usageErr.message);
  } else {
    console.log(`Found ${usageLogs.length} usage log records`);
    if (usageLogs.length > 0) {
      const headers = Object.keys(usageLogs[0]);
      const csv = toCSV(usageLogs, headers);
      writeFileSync('./tmp/ai_usage_logs.csv', csv);
      console.log('✅ Saved: tmp/ai_usage_logs.csv');

      // Calculate cost stats
      const itineraryLogs = usageLogs.filter(l =>
        l.feature_type && l.feature_type.toLowerCase().includes('itinerary')
      );
      const allCosts = usageLogs.map(l => parseFloat(l.cost_estimate) || 0).filter(c => c > 0);
      const itineraryCosts = itineraryLogs.map(l => parseFloat(l.cost_estimate) || 0).filter(c => c > 0);

      console.log('\n--- Cost Analysis ---');
      console.log(`Total records: ${usageLogs.length}`);
      console.log(`Itinerary-related records: ${itineraryLogs.length}`);
      if (allCosts.length) {
        const avg = allCosts.reduce((a, b) => a + b, 0) / allCosts.length;
        const min = Math.min(...allCosts);
        const max = Math.max(...allCosts);
        console.log(`\nAll features - avg cost: $${avg.toFixed(6)}, min: $${min.toFixed(6)}, max: $${max.toFixed(6)}`);
      }
      if (itineraryCosts.length) {
        const avg = itineraryCosts.reduce((a, b) => a + b, 0) / itineraryCosts.length;
        const min = Math.min(...itineraryCosts);
        const max = Math.max(...itineraryCosts);
        console.log(`Itinerary only - avg cost: $${avg.toFixed(6)}, min: $${min.toFixed(6)}, max: $${max.toFixed(6)}`);
      }

      // Feature breakdown
      const byFeature = {};
      for (const log of usageLogs) {
        const ft = log.feature_type || 'unknown';
        if (!byFeature[ft]) byFeature[ft] = { count: 0, totalCost: 0, totalTokens: 0 };
        byFeature[ft].count++;
        byFeature[ft].totalCost += parseFloat(log.cost_estimate) || 0;
        byFeature[ft].totalTokens += parseInt(log.tokens_used) || 0;
      }
      console.log('\n--- Breakdown by Feature Type ---');
      for (const [ft, stats] of Object.entries(byFeature)) {
        const avgCost = stats.count > 0 ? stats.totalCost / stats.count : 0;
        console.log(`${ft}: ${stats.count} calls, avg cost $${avgCost.toFixed(6)}, total tokens: ${stats.totalTokens}`);
      }

      // Save feature breakdown CSV
      const breakdownRows = Object.entries(byFeature).map(([ft, s]) => ({
        feature_type: ft,
        call_count: s.count,
        total_cost_usd: s.totalCost.toFixed(6),
        avg_cost_usd: (s.totalCost / s.count).toFixed(6),
        total_tokens: s.totalTokens,
        avg_tokens: Math.round(s.totalTokens / s.count)
      }));
      const breakdownCsv = toCSV(breakdownRows, Object.keys(breakdownRows[0]));
      writeFileSync('./tmp/cost_breakdown_by_feature.csv', breakdownCsv);
      console.log('✅ Saved: tmp/cost_breakdown_by_feature.csv');
    }
  }

  console.log('\n=== Fetching Itineraries ===');
  const { data: itineraries, error: itnErr } = await supabase
    .from('itineraries')
    .select('id, city_id, title, days, budget, travel_style, traveler_type, status, is_public, created_at')
    .order('created_at', { ascending: true });

  if (itnErr) {
    console.error('Error fetching itineraries:', itnErr.message);
  } else {
    console.log(`Found ${itineraries.length} itinerary records`);
    if (itineraries.length > 0) {
      const headers = Object.keys(itineraries[0]);
      const csv = toCSV(itineraries, headers);
      writeFileSync('./tmp/itineraries.csv', csv);
      console.log('✅ Saved: tmp/itineraries.csv');
    }
  }

  // ---- Hallucination data from itinerary content ----
  console.log('\n=== Fetching Full Itinerary Content for Hallucination Analysis ===');
  const { data: fullItns, error: fullErr } = await supabase
    .from('itineraries')
    .select('id, city_id, title, days, content, created_at')
    .order('created_at', { ascending: true });

  if (fullErr) {
    console.error('Error fetching full itineraries:', fullErr.message);
  } else {
    // Analyze hallucination markers
    const halluRows = [];
    for (const itn of fullItns) {
      const content = itn.content || {};
      const contentStr = JSON.stringify(content);

      // Hallucination signals: check for validation fields, confidence scores, any AI flags
      const hasValidationScore = content.validation_score !== undefined;
      const hasConfidenceScore = content.confidence !== undefined;
      const hasHallucinationFlag = content.hallucination_detected !== undefined;
      const hasGroundingScore = content.grounding_score !== undefined;
      const hasCorrectionApplied = content.correction_applied !== undefined;

      // Check for placeholder text (hallucination signal)
      const placeholderPatterns = ['[placeholder]', 'TBD', 'TODO', 'example.com', 'lorem ipsum'];
      const hasPlaceholders = placeholderPatterns.some(p => contentStr.toLowerCase().includes(p.toLowerCase()));

      // Check if content has required fields (completeness as proxy for reliability)
      const hasDayPlans = Array.isArray(content.days) || Array.isArray(content.itinerary);
      const hasHotelInfo = contentStr.toLowerCase().includes('hotel') || contentStr.toLowerCase().includes('accommodation');
      const hasFlightInfo = contentStr.toLowerCase().includes('flight') || contentStr.toLowerCase().includes('airline');

      // Agent pipeline flags
      const agentLogs = content.agent_logs || content.agentLogs || [];
      const agentCount = Array.isArray(agentLogs) ? agentLogs.length : 0;

      halluRows.push({
        itinerary_id: itn.id,
        city_id: itn.city_id,
        title: itn.title,
        days: itn.days,
        created_at: itn.created_at,
        has_validation_score: hasValidationScore,
        has_confidence_score: hasConfidenceScore,
        has_hallucination_flag: hasHallucinationFlag,
        has_grounding_score: hasGroundingScore,
        has_correction_applied: hasCorrectionApplied,
        validation_score: content.validation_score || 'N/A',
        confidence: content.confidence || 'N/A',
        grounding_score: content.grounding_score || 'N/A',
        hallucination_detected: content.hallucination_detected || 'N/A',
        has_placeholders: hasPlaceholders,
        has_day_plans: hasDayPlans,
        has_hotel_info: hasHotelInfo,
        has_flight_info: hasFlightInfo,
        agent_log_count: agentCount,
        content_size_chars: contentStr.length,
        reliability_proxy: hasDayPlans && hasHotelInfo && !hasPlaceholders ? 'HIGH' : hasPlaceholders ? 'LOW' : 'MEDIUM'
      });
    }

    if (halluRows.length > 0) {
      const halluCsv = toCSV(halluRows, Object.keys(halluRows[0]));
      writeFileSync('./tmp/hallucination_analysis.csv', halluCsv);
      console.log(`✅ Saved: tmp/hallucination_analysis.csv (${halluRows.length} rows)`);

      const high = halluRows.filter(r => r.reliability_proxy === 'HIGH').length;
      const med = halluRows.filter(r => r.reliability_proxy === 'MEDIUM').length;
      const low = halluRows.filter(r => r.reliability_proxy === 'LOW').length;
      console.log(`\nReliability Distribution: HIGH=${high}, MEDIUM=${med}, LOW=${low}`);
    }
  }

  console.log('\n=== Done! Check tmp/ folder for CSV files ===');
}

main().catch(console.error);
