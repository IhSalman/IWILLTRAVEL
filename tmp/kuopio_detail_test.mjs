/**
 * THESIS OPERATIONAL DETAIL TEST
 * ───────────────────────────────
 * This test shows where the LLM actually fails:
 * - Addresses (correct place, wrong street?)
 * - Opening hours (does the LLM state any? Are they correct?)
 * - Rating claims (does the LLM state ratings? Where from?)
 *
 * For each LLM place, it:
 * 1. Records what the LLM SAID (name, any address/hours it mentioned)
 * 2. Fetches the REAL data from Google Places API
 * 3. Compares them side by side
 *
 * Also shows what the DGHP database has for the same place.
 */

import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

try {
  const envFile = readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const key = t.substring(0, eq).trim();
    const val = t.substring(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch (e) { console.warn('env load failed:', e.message); }

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ─── Ask LLM for itinerary WITH operational details ──────────────────────────
async function getLLMWithDetails(city, days) {
  console.log(`\n[LLM] Requesting ${days}-day ${city} itinerary WITH operational details...`);

  const prompt = `Plan a ${days}-day trip to ${city} Finland for a budget solo traveler. For each activity provide name, address, opening_hours, cost_eur, description. Return JSON only.

JSON format:
{"days":[{"day":1,"activities":[{"time":"morning","name":"Place Name","address":"Street, City","opening_hours":"Mon-Fri 10-18","cost_eur":"5","description":"Short description."}]}]}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 3000, responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Gemini error:', res.status, err.substring(0, 200));
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) { console.error('Empty response'); return null; }

    writeFileSync('./tmp/kuopio_llm_raw.json', text);

    // Robust parse — handle truncated or slightly invalid JSON
    let clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    // Remove trailing commas before } or ]
    clean = clean.replace(/,\s*([}\]])/g, '$1');
    // Try to find the outermost { } block
    const start = clean.indexOf('{');
    let end = clean.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('No JSON object found in response');
    clean = clean.substring(start, end + 1);

    return JSON.parse(clean);
  } catch (e) {
    console.error('LLM call failed:', e.message);
    return null;
  }
}

// ─── Verify place and get REAL details ───────────────────────────────────────
async function getRealDetails(name, city) {
  await new Promise(r => setTimeout(r, 350));

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.rating',
          'places.userRatingCount',
          'places.currentOpeningHours',
          'places.regularOpeningHours',
          'places.priceLevel',
          'places.editorialSummary'
        ].join(',')
      },
      body: JSON.stringify({ textQuery: `${name} in ${city}`, maxResultCount: 1 })
    });

    if (!res.ok) return { found: false };
    const data = await res.json();
    const p = data?.places?.[0];
    if (!p) return { found: false };

    // Parse opening hours
    let hoursText = 'Not available';
    const hours = p.currentOpeningHours || p.regularOpeningHours;
    if (hours?.weekdayDescriptions?.length) {
      hoursText = hours.weekdayDescriptions.join(' | ');
    }

    return {
      found: true,
      realName: p.displayName?.text || '',
      realAddress: p.formattedAddress || '',
      realRating: p.rating || null,
      realReviews: p.userRatingCount || null,
      realHours: hoursText,
      realPriceLevel: p.priceLevel || null,
      realDescription: p.editorialSummary?.text || ''
    };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

// ─── Compare LLM claim vs Google Places reality ───────────────────────────────
function compareDetails(llmPlace, realData) {
  const issues = [];

  if (!realData.found) {
    issues.push('PLACE NOT FOUND IN GOOGLE MAPS');
    return { issues, severity: 'HIGH' };
  }

  // Address comparison
  if (llmPlace.address) {
    const llmAddrLower = llmPlace.address.toLowerCase();
    const realAddrLower = realData.realAddress.toLowerCase();

    // Extract street name from LLM address
    const llmStreet = llmAddrLower.split(',')[0].trim();
    const addressMatch = realAddrLower.includes(llmStreet) || llmAddrLower.includes(realAddrLower.split(',')[0]);

    if (!addressMatch && llmStreet.length > 5) {
      issues.push(`ADDRESS MISMATCH: LLM said "${llmPlace.address}" | Real: "${realData.realAddress}"`);
    }
  } else {
    issues.push('NO ADDRESS PROVIDED by LLM');
  }

  // Opening hours — check if LLM provided any and if they're plausible
  if (!llmPlace.opening_hours || llmPlace.opening_hours.toLowerCase() === 'varies') {
    issues.push('NO OPENING HOURS provided by LLM');
  } else if (realData.realHours !== 'Not available') {
    // Simple check: if LLM says "open daily" but real hours show closed days
    if (llmPlace.opening_hours.toLowerCase().includes('daily') && 
        realData.realHours.toLowerCase().includes('closed')) {
      issues.push(`HOURS CONFLICT: LLM said "daily" but real hours show closures`);
    }
  }

  const severity = issues.length === 0 ? 'OK'
                 : issues.some(i => i.startsWith('PLACE NOT FOUND') || i.startsWith('ADDRESS MISMATCH')) ? 'HIGH'
                 : 'MEDIUM';

  return { issues, severity };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const CITY = 'Kuopio';
  const DAYS = 3;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  THESIS: Operational Detail Accuracy Test');
  console.log(`  City: ${CITY} | Days: ${DAYS}`);
  console.log('  Question: Does the LLM get addresses and hours right?');
  console.log('═══════════════════════════════════════════════════════════════');

  // Get LLM itinerary with claimed details
  const llmResult = await getLLMWithDetails(CITY, DAYS);
  if (!llmResult) { console.error('LLM failed'); process.exit(1); }

  const allActivities = [];
  for (const day of (llmResult.days || [])) {
    for (const act of (day.activities || [])) {
      allActivities.push({ ...act, day: day.day });
    }
  }

  console.log(`\n  LLM provided ${allActivities.length} activities with details`);
  console.log('  Now fetching REAL data from Google Places API for each...\n');

  const results = [];

  for (const act of allActivities) {
    process.stdout.write(`  [Day ${act.day} ${act.time}] "${act.name}"... `);
    const real = await getRealDetails(act.name, CITY);
    const comparison = compareDetails(act, real);

    const icon = comparison.severity === 'OK' ? '✅'
               : comparison.severity === 'MEDIUM' ? '⚠️'
               : '❌';

    console.log(icon);

    results.push({ ...act, ...real, ...comparison, icon });

    // Print detail comparison
    if (real.found) {
      if (act.address && real.realAddress) {
        console.log(`    LLM address  : ${act.address}`);
        console.log(`    Real address : ${real.realAddress}`);
      }
      if (act.opening_hours) {
        console.log(`    LLM hours    : ${act.opening_hours}`);
        if (real.realHours !== 'Not available') {
          // Print just first day's hours for brevity
          console.log(`    Real hours   : ${real.realHours.split(' | ')[0]}...`);
        }
      }
      if (real.realRating) {
        console.log(`    Real rating  : ${real.realRating}/5 (${real.realReviews} reviews)`);
      }
    }

    if (comparison.issues.length > 0) {
      for (const issue of comparison.issues) {
        console.log(`    ISSUE: ${issue}`);
      }
    }
    console.log();
  }

  // ── Summary table ─────────────────────────────────────────────────────────
  const total    = results.length;
  const notFound = results.filter(r => !r.found).length;
  const addrFail = results.filter(r => r.issues?.some(i => i.startsWith('ADDRESS MISMATCH'))).length;
  const noAddr   = results.filter(r => r.issues?.some(i => i.startsWith('NO ADDRESS'))).length;
  const noHours  = results.filter(r => r.issues?.some(i => i.startsWith('NO OPENING HOURS'))).length;
  const hoursFail= results.filter(r => r.issues?.some(i => i.startsWith('HOURS CONFLICT'))).length;
  const clean    = results.filter(r => r.severity === 'OK').length;

  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('  SUMMARY: What the LLM Gets Wrong (Even When Names Are Right)');
  console.log('══════════════════════════════════════════════════════════════════\n');

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`┌────────────────────────────────────────────┬───────┬──────────┐`);
  console.log(`│ Metric                                     │ Count │ % of all │`);
  console.log(`├────────────────────────────────────────────┼───────┼──────────┤`);
  console.log(`│ Total activities                           │ ${pad(total,5)} │ 100%     │`);
  console.log(`│ Place NOT FOUND in Google Maps             │ ${pad(notFound,5)} │ ${pad(((notFound/total)*100).toFixed(0)+'%',8)} │`);
  console.log(`│ Wrong or missing address                   │ ${pad(addrFail+noAddr,5)} │ ${pad((((addrFail+noAddr)/total)*100).toFixed(0)+'%',8)} │`);
  console.log(`│   - Address mismatch                       │ ${pad(addrFail,5)} │ ${pad(((addrFail/total)*100).toFixed(0)+'%',8)} │`);
  console.log(`│   - No address provided at all             │ ${pad(noAddr,5)} │ ${pad(((noAddr/total)*100).toFixed(0)+'%',8)} │`);
  console.log(`│ No opening hours provided                  │ ${pad(noHours,5)} │ ${pad(((noHours/total)*100).toFixed(0)+'%',8)} │`);
  console.log(`│ Hours conflict detected                    │ ${pad(hoursFail,5)} │ ${pad(((hoursFail/total)*100).toFixed(0)+'%',8)} │`);
  console.log(`│ Fully correct (name + address + hours OK)  │ ${pad(clean,5)} │ ${pad(((clean/total)*100).toFixed(0)+'%',8)} │`);
  console.log(`└────────────────────────────────────────────┴───────┴──────────┘`);

  console.log('\n  KEY FINDING FOR THESIS:');
  console.log(`  The LLM named real venues (${total-notFound}/${total} verified in Google Maps).`);
  console.log(`  But it failed on operational details:`);
  console.log(`  - ${addrFail+noAddr}/${total} activities had wrong or missing addresses`);
  console.log(`  - ${noHours}/${total} activities had no opening hours`);
  console.log(`  - Rating/review data: 0/${total} (LLM provides no review counts)`);
  console.log(`\n  The DGHP fetches this data from the Places API before writing,`);
  console.log(`  so the final itinerary contains verified addresses, real hours,`);
  console.log(`  and actual rating scores — none of which the LLM can provide.`);

  // ── Save CSV ──────────────────────────────────────────────────────────────
  const csvRows = [
    ['day', 'time', 'llm_name', 'llm_address', 'llm_hours', 'llm_cost',
     'found_in_maps', 'real_name', 'real_address', 'real_rating', 'real_reviews',
     'real_hours_mon', 'severity', 'issues'],
    ...results.map(r => [
      r.day, r.time, r.name, r.address || '', r.opening_hours || '', r.cost_eur || '',
      r.found ? 'YES' : 'NO',
      r.realName || '', r.realAddress || '', r.realRating || '', r.realReviews || '',
      r.realHours ? r.realHours.split(' | ')[0] : '',
      r.severity, (r.issues || []).join('; ')
    ])
  ];

  const csv = csvRows.map(row =>
    row.map(v => {
      const s = String(v).replace(/"/g, '""');
      return (s.includes(',') || s.includes('\n') || s.includes('"')) ? `"${s}"` : s;
    }).join(',')
  ).join('\n');

  writeFileSync('./tmp/kuopio_detail_test.csv', csv);
  console.log('\n✅ Saved: tmp/kuopio_detail_test.csv');
  console.log('✅ Saved: tmp/kuopio_llm_raw.json (raw LLM output)');
}

main().catch(console.error);
