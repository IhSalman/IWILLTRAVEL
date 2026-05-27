/**
 * Debug: see what Gemini 2.5 Flash actually returns
 */
import { readFileSync, writeFileSync } from 'fs';
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
} catch (e) {}

const GEMINI_KEY = process.env.GEMINI_API_KEY;

const prompt = `Plan a 3-day trip to Kuopio Finland. For each activity provide name, address, opening_hours, cost_eur, description. Return JSON only.

JSON format:
{"days":[{"day":1,"activities":[{"time":"morning","name":"Place Name","address":"Street, City","opening_hours":"Mon-Fri 10-18","cost_eur":"5","description":"Short description."}]}]}`;

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json'
    }
  })
});

const status = res.status;
const raw = await res.json();

const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
const finishReason = raw?.candidates?.[0]?.finishReason;

console.log('HTTP Status:', status);
console.log('Finish reason:', finishReason);
console.log('Text length:', text.length);
console.log('First 500 chars:', text.substring(0, 500));
console.log('Last 200 chars:', text.substring(text.length - 200));

writeFileSync('./tmp/gemini_debug.json', JSON.stringify({ status, finishReason, textLength: text.length, text }, null, 2));
console.log('\nSaved full response to tmp/gemini_debug.json');

// Try parsing
try {
  let clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  clean = clean.replace(/,\s*([}\]])/g, '$1');
  const parsed = JSON.parse(clean);
  const total = parsed.days?.reduce((n, d) => n + (d.activities?.length || 0), 0);
  console.log('JSON parsed successfully! Total activities:', total);
  writeFileSync('./tmp/kuopio_llm_parsed.json', JSON.stringify(parsed, null, 2));
} catch (e) {
  console.error('Parse failed:', e.message);
  // Find where it breaks
  let clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const failPos = parseInt(e.message.match(/position (\d+)/)?.[1] || '0');
  console.log('Context around failure position', failPos, ':');
  console.log(JSON.stringify(clean.substring(Math.max(0, failPos-50), failPos+50)));
}
