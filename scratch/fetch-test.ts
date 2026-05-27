
import fs from 'fs';
import path from 'path';

function getApiKey() {
    const envPaths = [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '.env.local'),
    ];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8');
            const match = content.match(/GEMINI_API_KEY=([^\s]+)/);
            if (match) return match[1].replace(/"/g, '').replace(/'/g, '');
        }
    }
    return process.env.GEMINI_API_KEY;
}

async function testFetch() {
    const key = getApiKey();
    if (!key) return;

    console.log('--- FETCH DIAGNOSTIC ---');
    const versions = ['v1', 'v1beta'];
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro'];

    for (const v of versions) {
        for (const m of models) {
            const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${key}`;
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
                });
                const data = await res.json();
                if (res.ok) {
                    console.log(`✅ [${v}] [${m}] works!`);
                } else {
                    console.log(`❌ [${v}] [${m}] failed: ${res.status} ${data.error?.message || 'No message'}`);
                }
            } catch (err: any) {
                console.log(`💥 [${v}] [${m}] error: ${err.message}`);
            }
        }
    }
}

testFetch();
