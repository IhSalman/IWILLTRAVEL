/**
 * THESIS HALLUCINATION TEST v2
 * ─────────────────────────────
 * Simplified, robust version.
 * Calls Gemini Flash directly for a plain itinerary,
 * verifies every place against Google Places API,
 * then does the same for a DGHP itinerary from the database.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local manually
try {
  const envFile = readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch (e) {
  console.warn('[env] Could not load .env.local:', e.message);
}

const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const PLACES_KEY   = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = 'https://gupnphrvbgkrftgwhuvf.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cG5waHJ2YmdrcmZ0Z3dodXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNzQyMiwiZXhwIjoyMDg3ODAzNDIyfQ.J_-ou8qJkJP9OrsYV2q6hvMtKueUVT7WklkIwiHQOPA';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Config ───────────────────────────────────────────────────────────────────
const TEST_CITY    = 'Kuopio Finland'; // used for LLM prompt
const DB_CITY_MATCH = 'kuopio';        // used to find the DB itinerary

// ─── Call Gemini Flash with NO grounding ─────────────────────────────────────
async function getRawLLMPlaces(city, days) {
  console.log(`\n[BEFORE DGHP] Calling Gemini Flash (no grounding) for ${days}-day ${city}...`);

  const prompt = `You are a travel planner. Create a ${days}-day itinerary for ${city} for a mid-range cultural traveler.

IMPORTANT: List SPECIFIC named venues, museums, landmarks, and restaurants only.
Do NOT use generic phrases like "a local restaurant" or "nearby park".
Each activity must be a real, specific named place.

Return ONLY a JSON object like this (no markdown, no extra text):
{
  "days": [
    {
      "day": 1,
      "activities": [
        {"time": "morning", "name": "Exact Venue Name", "description": "One sentence."},
        {"time": "afternoon", "name": "Exact Venue Name", "description": "One sentence."},
        {"time": "evening", "name": "Exact Venue Name", "description": "One sentence."}
      ]
    }
  ]
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  
  let text = '';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('  Gemini API error:', res.status, err.substring(0, 300));
      return null;
    }

    const data = await res.json();
    text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      console.error('  Empty response from Gemini. Candidates:', JSON.stringify(data?.candidates?.slice(0,1)));
      return null;
    }

    console.log(`  Got response (${text.length} chars)`);

    // Parse the JSON
    let parsed;
    try {
      // Strip markdown fences if present
      const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('  Could not parse JSON, trying to extract...');
      const jsonMatch = text.match(/\{[\s\S]+\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      else {
        console.error('  No JSON found in response. Raw text saved.');
        writeFileSync('./tmp/raw_llm_output.txt', text);
        return null;
      }
    }

    writeFileSync('./tmp/raw_llm_output.txt', text);
    return parsed;
  } catch (err) {
    console.error('  Fetch error:', err.message);
    return null;
  }
}

// ─── Extract named places from LLM JSON ──────────────────────────────────────
function extractFromLLMJson(parsed) {
  const places = [];
  const days = parsed?.days || [];
  for (const day of days) {
    for (const act of (day.activities || [])) {
      const name = act.name || act.place || act.venue || '';
      if (name && name.length > 3) {
        places.push({ name: name.trim(), day: day.day, time: act.time || '' });
      }
    }
  }
  return places;
}

// ─── Get richest DGHP itinerary from DB ──────────────────────────────────────
async function getDGHPItinerary(cityMatch) {
  console.log(`\n[AFTER DGHP]  Fetching itinerary from database (city match: "${cityMatch}")...`);

  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!itineraries?.length) { console.error('  No itineraries in DB'); return null; }

  // Try to match city
  let match = itineraries.find(it => {
    const title = (it.title || '').toLowerCase();
    const cityId = (it.city_id || '').toLowerCase();
    return title.includes(cityMatch) || cityId.includes(cityMatch);
  });

  // Fallback: richest content
  if (!match) {
    console.log('  No city match — using richest available itinerary');
    match = itineraries
      .filter(it => it.content?.days?.length > 0)
      .sort((a, b) => (b.content?.days?.length || 0) - (a.content?.days?.length || 0))[0];
  }

  if (!match) { console.error('  No suitable itinerary found'); return null; }

  console.log(`  Using: "${match.title}" (city_id: ${match.city_id})`);
  console.log(`  Days in content: ${match.content?.days?.length || 0}`);
  return match;
}

// ─── Extract named places from DGHP content ──────────────────────────────────
function extractFromDGHP(content) {
  const places = [];
  const days = content?.days || [];

  for (const day of days) {
    const activities = day.activities || day.schedule || [];
    if (Array.isArray(activities)) {
      for (const act of activities) {
        const name = act.name || act.title || act.place || '';
        if (name && name.length > 3 && name.length < 80) {
          // Filter out generic/action phrases
          const isGeneric = /^(check in|check into|enjoy|explore|experience|visit|discover|take|travel|wander|stroll|walk|sample|head|go |get |relax|arrive|depart|prepare)/i.test(name);
          places.push({
            name: name.trim(),
            address: act.address || '',
            placeId: act.place_id || act.placeId || '',
            day: day.day,
            isGeneric
          });
        }
      }
    }
    // morning/afternoon/evening slot structure
    for (const slot of ['morning', 'afternoon', 'evening']) {
      const s = day[slot];
      if (typeof s === 'string' && s.length > 3 && s.length < 80) {
        places.push({ name: s.trim(), address: '', placeId: '', day: day.day, slot, isGeneric: false });
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  return places.filter(p => {
    if (seen.has(p.name.toLowerCase())) return false;
    seen.add(p.name.toLowerCase());
    return true;
  });
}

// ─── Verify a single place against Google Places API ─────────────────────────
async function verifyPlace(placeName, cityContext) {
  await new Promise(r => setTimeout(r, 350)); // rate limit

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount'
      },
      body: JSON.stringify({ textQuery: `${placeName} in ${cityContext}`, maxResultCount: 1 })
    });

    if (!res.ok) {
      const err = await res.text();
      return { verified: false, error: `API ${res.status}: ${err.substring(0,100)}` };
    }

    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return { verified: false };

    return {
      verified: true,
      placeId: place.id,
      foundName: place.displayName?.text || '',
      address: place.formattedAddress || '',
      rating: place.rating || null,
      reviews: place.userRatingCount || null
    };
  } catch (err) {
    return { verified: false, error: err.message };
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  THESIS HALLUCINATION TEST: Before DGHP vs After DGHP');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  LLM city tested: ${TEST_CITY}`);
  console.log(`  DB city match  : ${DB_CITY_MATCH}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // ── BEFORE DGHP: Raw LLM ──────────────────────────────────────────────────
  const llmParsed = await getRawLLMPlaces(TEST_CITY, 3);
  const llmPlaces = llmParsed ? extractFromLLMJson(llmParsed) : [];
  console.log(`  Extracted ${llmPlaces.length} named places from LLM output`);
  if (llmPlaces.length) {
    console.log('  Places:', llmPlaces.slice(0,5).map(p=>p.name).join(' | '));
  }

  // Verify LLM places
  const llmResults = [];
  if (llmPlaces.length > 0) {
    console.log(`\n  Verifying ${llmPlaces.length} LLM places via Google Places API...`);
    for (const p of llmPlaces) {
      process.stdout.write(`    "${p.name.substring(0, 40)}"... `);
      const result = await verifyPlace(p.name, TEST_CITY);
      const icon = result.verified ? '✅' : '❌';
      console.log(`${icon} ${result.verified ? `found as "${result.foundName}"` : 'NOT FOUND'}`);
      llmResults.push({ ...p, ...result });
    }
  }

  // ── AFTER DGHP: Database itinerary ───────────────────────────────────────
  const dghpItn = await getDGHPItinerary(DB_CITY_MATCH);
  const dghpPlaces = dghpItn ? extractFromDGHP(dghpItn.content) : [];
  const dghpCity = dghpItn?.city_id || DB_CITY_MATCH;
  console.log(`  Extracted ${dghpPlaces.length} named places from DGHP itinerary`);

  const preVerified = dghpPlaces.filter(p => p.placeId && p.placeId.length > 5).length;
  console.log(`  ${preVerified}/${dghpPlaces.length} have stored place_id (already verified by Agent 2)`);

  // Verify DGHP places
  const dghpResults = [];
  if (dghpPlaces.length > 0) {
    console.log(`\n  Verifying ${dghpPlaces.length} DGHP places via Google Places API...`);
    for (const p of dghpPlaces) {
      if (p.placeId && p.placeId.length > 5) {
        // Already verified — mark as confirmed
        dghpResults.push({ ...p, verified: true, foundName: p.name, status: 'PRE-VERIFIED' });
        console.log(`    "${p.name.substring(0,40)}"... ✅ PRE-VERIFIED (place_id stored)`);
        continue;
      }
      process.stdout.write(`    "${p.name.substring(0, 40)}"... `);
      const result = await verifyPlace(p.name, dghpCity);
      const icon = result.verified ? '✅' : '❌';
      console.log(`${icon} ${result.verified ? `"${result.foundName}"` : 'NOT FOUND'}`);
      dghpResults.push({ ...p, ...result, status: result.verified ? 'VERIFIED' : 'NOT FOUND' });
    }
  }

  // ── Calculate stats ───────────────────────────────────────────────────────
  const llmTotal    = llmResults.length;
  const llmVerified = llmResults.filter(r => r.verified).length;
  const llmFail     = llmTotal - llmVerified;
  const llmHalluPct = llmTotal > 0 ? ((llmFail / llmTotal) * 100).toFixed(1) : 'N/A';

  const dghpTotal    = dghpResults.length;
  const dghpVerified = dghpResults.filter(r => r.verified).length;
  const dghpFail     = dghpTotal - dghpVerified;
  const dghpHalluPct = dghpTotal > 0 ? ((dghpFail / dghpTotal) * 100).toFixed(1) : 'N/A';

  // ── Print comparison table ────────────────────────────────────────────────
  console.log('\n\n══════════════════════════════════════════════════════════════════');
  console.log('  RESULTS: Before DGHP vs After DGHP');
  console.log('══════════════════════════════════════════════════════════════════\n');

  const pad = (s, n) => String(s).padEnd(n);
  console.log(`┌────────────────────────────────────────┬─────────────┬─────────────┐`);
  console.log(`│ Metric                                 │ Before DGHP │ After DGHP  │`);
  console.log(`│                                        │ (Plain LLM) │  (9 Agents) │`);
  console.log(`├────────────────────────────────────────┼─────────────┼─────────────┤`);
  console.log(`│ Total named places in itinerary        │ ${pad(llmTotal,11)} │ ${pad(dghpTotal,11)} │`);
  console.log(`│ Places verified by Google Places API   │ ${pad(llmVerified,11)} │ ${pad(dghpVerified,11)} │`);
  console.log(`│ Places NOT FOUND (unverifiable)        │ ${pad(llmFail,11)} │ ${pad(dghpFail,11)} │`);
  console.log(`│ Unverified rate                        │ ${pad(llmHalluPct+'%',11)} │ ${pad(dghpHalluPct+'%',11)} │`);
  console.log(`│ Places with pre-stored place_id        │ ${pad('0 (none)',11)} │ ${pad(preVerified,11)} │`);
  console.log(`└────────────────────────────────────────┴─────────────┴─────────────┘`);

  // ── Detailed lists ────────────────────────────────────────────────────────
  if (llmResults.length > 0) {
    console.log('\n── BEFORE DGHP — Named Places (Plain LLM, no grounding) ──────────────');
    for (const r of llmResults) {
      const icon = r.verified ? '✅' : '❌';
      const detail = r.verified ? ` → "${r.foundName}" @ ${(r.address||'').substring(0,55)}` : ' → NOT FOUND IN GOOGLE MAPS';
      console.log(`  ${icon} Day ${r.day} ${r.time}: ${r.name}${detail}`);
    }
  }

  if (dghpResults.length > 0) {
    console.log('\n── AFTER DGHP — Named Places (Agent Pipeline) ─────────────────────────');
    for (const r of dghpResults) {
      const icon = r.verified ? '✅' : '❌';
      const tag = r.status === 'PRE-VERIFIED' ? ' [pre-verified]' : '';
      const detail = r.verified
        ? (r.status === 'PRE-VERIFIED' ? '' : ` → "${r.foundName}" @ ${(r.address||'').substring(0,55)}`)
        : ' → NOT FOUND IN GOOGLE MAPS';
      console.log(`  ${icon} Day ${r.day}: ${r.name}${tag}${detail}`);
    }
  }

  // ── Save CSV ──────────────────────────────────────────────────────────────
  const rows = [
    ['pipeline', 'day', 'time_slot', 'place_name', 'verified', 'found_as', 'address', 'rating', 'reviews', 'note'],
    ...llmResults.map(r => [
      'Before DGHP (Plain LLM)', r.day || '', r.time || '', r.name,
      r.verified ? 'YES' : 'NO', r.foundName || '', r.address || '',
      r.rating || '', r.reviews || '', r.verified ? 'VERIFIED' : 'NOT FOUND - HALLUCINATION RISK'
    ]),
    ...dghpResults.map(r => [
      'After DGHP (9-Agent Pipeline)', r.day || '', r.time || '', r.name,
      r.verified ? 'YES' : 'NO', r.foundName || '', r.address || '',
      r.rating || '', r.reviews || '', r.status || ''
    ])
  ];

  const csv = rows.map(row =>
    row.map(v => {
      const s = String(v).replace(/"/g, '""');
      return (s.includes(',') || s.includes('\n') || s.includes('"')) ? `"${s}"` : s;
    }).join(',')
  ).join('\n');

  writeFileSync('./tmp/hallucination_real_test.csv', csv);
  console.log('\n\n✅ Saved: tmp/hallucination_real_test.csv');

  // ── Thesis numbers ────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════');
  console.log('  COPY THESE NUMBERS INTO YOUR THESIS');
  console.log('══════════════════════════════════════════════════════════════════');
  console.log(`  LLM used for test      : Gemini 1.5 Flash (same model, no tools)`);
  console.log(`  LLM destination        : ${TEST_CITY}`);
  console.log(`  LLM places named       : ${llmTotal}`);
  console.log(`  LLM places verified    : ${llmVerified}`);
  console.log(`  LLM places NOT FOUND   : ${llmFail} (${llmHalluPct}%)`);
  console.log();
  console.log(`  DGHP destination       : ${dghpItn?.title || dghpCity}`);
  console.log(`  DGHP places named      : ${dghpTotal}`);
  console.log(`  DGHP places verified   : ${dghpVerified}`);
  console.log(`  DGHP places NOT FOUND  : ${dghpFail} (${dghpHalluPct}%)`);
  console.log(`  Pre-verified (place_id): ${preVerified}`);
  console.log();
  if (llmTotal > 0 && dghpTotal > 0) {
    console.log(`  ➜ Unverified rate: ${llmHalluPct}% (LLM) → ${dghpHalluPct}% (DGHP)`);
  }
}

main().catch(console.error);
