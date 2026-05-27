/**
 * Thesis Data Autopsy — Live Kuopio Pipeline Capture
 * Executes ONLY Agent 1 (Discovery) against the real Google Places API
 * and saves the raw JSON response for thesis evidence.
 *
 * Run: node scratch/thesis_live_capture.js
 */

const fs = require('fs');
const path = require('path');

const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

if (!GOOGLE_PLACES_KEY) {
    console.error('❌ Set GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY in your environment.');
    console.log('   PowerShell: $env:GOOGLE_MAPS_API_KEY="AIza..."');
    process.exit(1);
}

const FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.priceLevel',
    'places.primaryType',
    'places.currentOpeningHours.openNow',
].join(',');

async function googleTextSearch(query) {
    const startMs = Date.now();
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
            'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({ textQuery: query, languageCode: 'en', maxResultCount: 8 }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.substring(0, 300)}`);
    }
    const raw = await res.json();
    const durationMs = Date.now() - startMs;
    return { raw, durationMs };
}

async function main() {
    const DESTINATION = 'Kuopio, Finland';
    const QUERIES = [
        `top attractions in ${DESTINATION}`,
        `best things to do in ${DESTINATION}`,
        `highly rated restaurants in ${DESTINATION}`,
        `popular tourist spots in ${DESTINATION}`,
        `hidden gems in ${DESTINATION}`
    ];

    console.log('\n🔍 DGIS Thesis — Live Agent 1 (Discovery) Capture');
    console.log('═'.repeat(60));
    console.log(`Destination: ${DESTINATION}`);
    console.log(`Queries: ${QUERIES.length}`);
    console.log(`API: Google Places API (New) — places:searchText`);
    console.log(`FieldMask: ${FIELD_MASK}`);
    console.log('═'.repeat(60) + '\n');

    const allRawResponses = [];
    const captureStart = Date.now();

    for (const query of QUERIES) {
        console.log(`📡 Query: "${query}"`);
        try {
            const { raw, durationMs } = await googleTextSearch(query);
            const venueCount = raw.places?.length || 0;
            console.log(`   ✅ ${venueCount} places returned in ${durationMs}ms`);
            allRawResponses.push({ query, durationMs, venueCount, raw });
        } catch (err) {
            console.error(`   ❌ Failed: ${err.message}`);
            allRawResponses.push({ query, error: err.message });
        }
    }

    const totalMs = Date.now() - captureStart;

    // ── De-duplicate by place ID ─────────────────────────────────────────────
    const venueMap = new Map();
    allRawResponses.forEach(({ raw }) => {
        if (!raw?.places) return;
        raw.places.forEach(p => {
            const key = p.id || p.displayName?.text?.toLowerCase();
            if (!venueMap.has(key)) venueMap.set(key, p);
        });
    });

    const deduplicatedVenues = Array.from(venueMap.values()).map(p => ({
        placeId: p.id,
        name: p.displayName?.text || '',
        address: p.formattedAddress || '',
        rating: p.rating || null,
        totalRatings: p.userRatingCount || 0,
        priceLevel: p.priceLevel?.replace('PRICE_LEVEL_', '').toLowerCase() || null,
        types: p.primaryType ? [p.primaryType.replace(/_/g, ' ')] : [],
        openNow: p.currentOpeningHours?.openNow ?? null,
        lat: p.location?.latitude || null,
        lng: p.location?.longitude || null,
    }));

    // ── Save raw API responses ────────────────────────────────────────────────
    const rawOutput = {
        capturedAt: new Date().toISOString(),
        destination: DESTINATION,
        totalDurationMs: totalMs,
        queriesExecuted: QUERIES.length,
        rawApiResponses: allRawResponses,
    };

    const rawPath = path.join(__dirname, 'thesis_raw_places_api.json');
    fs.writeFileSync(rawPath, JSON.stringify(rawOutput, null, 2));

    // ── Save cleaned (Blackboard-formatted) venues ────────────────────────────
    const blackboardOutput = {
        capturedAt: new Date().toISOString(),
        destination: DESTINATION,
        source: 'Google Places API (New)',
        discoveryDurationMs: totalMs,
        totalDiscovered: deduplicatedVenues.length,
        venues: deduplicatedVenues,
    };

    const bbPath = path.join(__dirname, 'thesis_blackboard_venues.json');
    fs.writeFileSync(bbPath, JSON.stringify(blackboardOutput, null, 2));

    // ── Console Summary ───────────────────────────────────────────────────────
    console.log('\n═'.repeat(60));
    console.log('📊 CAPTURE SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total queries         : ${QUERIES.length}`);
    console.log(`Total duration        : ${totalMs}ms`);
    console.log(`Raw API places (total): ${allRawResponses.reduce((a,r) => a + (r.venueCount||0), 0)}`);
    console.log(`After de-duplication  : ${deduplicatedVenues.length} unique venues`);
    console.log('\nVenues discovered:');
    deduplicatedVenues.forEach((v, i) => {
        const rating = v.rating ? `⭐ ${v.rating} (${v.totalRatings})` : 'No rating';
        console.log(`  ${String(i+1).padStart(2)}. ${v.name.padEnd(35)} ${rating}`);
    });

    // ── Agent 2 Prompt Preview ────────────────────────────────────────────────
    const venueListForPrompt = deduplicatedVenues.map(v =>
        `- ${v.name} (${v.types[0] || 'Venue'}) - ${v.address}`
    ).join('\n');

    const agent2Prompt = `You are the world's most precise Strategic Planning Agent. Your output powers a production travel app.

MISSION: Build a day-by-day itinerary skeleton that is:
1. GEOGRAPHICALLY FLAWLESS — every activity on a given day must be within the SAME neighborhood or district.
2. HYPER-SPECIFIC — use exact real place names, not generic descriptions.
3. GROUNDED — use the verified venue pool provided below. Do NOT invent locations.

VERIFIED VENUE POOL (MUST USE THESE WHEREVER POSSIBLE TO ELIMINATE HALLUCINATIONS):
${venueListForPrompt}

INPUT:
- Destination: ${DESTINATION}
- Duration: 3 days
- Interests: sightseeing, local culture, nature
- Travel Style: balanced (3-4 activities/day — balanced mix of depth and variety)
- Traveler Type: solo
- Budget Level: moderate

OUTPUT SCHEMA (return ONLY this JSON):
{
  "plan": [
    {
      "day": 1,
      "city": "Exact city name",
      "neighborhood": "Specific district",
      "neighborhoodDescription": "1 sentence logic",
      "activities": ["Exact Real Place Name 1", "Exact Real Place Name 2"],
      "transitNote": "Transit logic"
    }
  ],
  "researchPlan": ["Tasks for Agent 3"]
}

STRICT RULE: If the pool contains venues, 100% of your activities MUST come from the pool.`;

    const promptPath = path.join(__dirname, 'thesis_agent2_prompt.txt');
    fs.writeFileSync(promptPath, agent2Prompt, 'utf-8');

    console.log('\n💾 Files saved:');
    console.log(`   Raw API JSON  → ${rawPath}`);
    console.log(`   Blackboard    → ${bbPath}`);
    console.log(`   Agent 2 Prompt → ${promptPath}`);
    console.log('\n✅ Data autopsy capture complete.\n');
}

main().catch(console.error);
