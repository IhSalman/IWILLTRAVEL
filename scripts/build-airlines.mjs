/**
 * Builds src/data/airlines.json: IATA ↔ ICAO airline codes, so travellers can search
 * by the flight number on their ticket (BA123) while ADS-B uses callsigns (BAW123).
 *
 *   node scripts/build-airlines.mjs
 *
 * Source: OpenFlights airlines.dat (ODbL), active airlines only. At runtime
 * src/lib/airlines.ts also asks adsbdb for codes missing here.
 */
import { writeFile, mkdir } from 'node:fs/promises';

const SRC = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat';

function parseLine(line) {
    const out = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"') quoted = false;
            else cur += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
    }
    out.push(cur);
    return out.map(v => (v === '\\N' ? '' : v.trim()));
}

const res = await fetch(SRC);
if (!res.ok) throw new Error(`OpenFlights download failed: ${res.status}`);

/** iata -> [[icao, name, country]] */
const byIata = {};
let count = 0;
for (const line of (await res.text()).split(/\r?\n/)) {
    if (!line) continue;
    const [, name, , iata, icao, , country, active] = parseLine(line);
    if (active !== 'Y') continue;
    if (!/^[A-Z0-9]{2}$/.test(iata) || !/^[A-Z]{3}$/.test(icao)) continue;
    (byIata[iata] ??= []).push([icao, name, country]);
    count++;
}

await mkdir('src/data', { recursive: true });
await writeFile('src/data/airlines.json', JSON.stringify(byIata));
console.log(`Wrote ${count} airlines (${Object.keys(byIata).length} IATA codes) to src/data/airlines.json`);
