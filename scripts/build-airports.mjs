/**
 * Builds public/data/airports.json from OurAirports (public domain).
 * Keeps only large + medium airports that have scheduled passenger service and an IATA code.
 *
 *   node scripts/build-airports.mjs
 *
 * Output row: [iata, icao, name, city, countryIso, lat, lon, size]  (size: 1 = large, 2 = medium)
 */
import { writeFile, mkdir } from 'node:fs/promises';

const SRC = 'https://davidmegginson.github.io/ourairports-data/airports.csv';

function parseCsvLine(line) {
    const out = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
            else if (c === '"') quoted = false;
            else cur += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
    }
    out.push(cur);
    return out;
}

const res = await fetch(SRC);
if (!res.ok) throw new Error(`OurAirports download failed: ${res.status}`);
const lines = (await res.text()).split(/\r?\n/).filter(Boolean);
const header = parseCsvLine(lines[0]);
const col = Object.fromEntries(header.map((h, i) => [h, i]));

const rows = [];
for (const line of lines.slice(1)) {
    const r = parseCsvLine(line);
    const type = r[col.type];
    if (type !== 'large_airport' && type !== 'medium_airport') continue;
    if (r[col.scheduled_service] !== 'yes') continue;
    const iata = r[col.iata_code]?.trim();
    if (!iata || !/^[A-Z0-9]{3}$/.test(iata)) continue;
    const lat = Number(r[col.latitude_deg]);
    const lon = Number(r[col.longitude_deg]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    rows.push([
        iata,
        (r[col.icao_code] || r[col.gps_code] || r[col.ident] || '').trim(),
        r[col.name].trim(),
        r[col.municipality].trim(),
        r[col.iso_country].trim(),
        Math.round(lat * 1e4) / 1e4,
        Math.round(lon * 1e4) / 1e4,
        type === 'large_airport' ? 1 : 2,
    ]);
}

// Large airports first so they win label collisions on the map.
rows.sort((a, b) => a[7] - b[7] || a[0].localeCompare(b[0]));

await mkdir('public/data', { recursive: true });
await writeFile('public/data/airports.json', JSON.stringify(rows));
console.log(`Wrote ${rows.length} airports to public/data/airports.json`);
