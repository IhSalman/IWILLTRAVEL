
import fs from 'fs';
import path from 'path';

function getApiKey() {
    const envPaths = [path.join(process.cwd(), '.env'), path.join(process.cwd(), '.env.local')];
    for (const p of envPaths) {
        if (fs.existsSync(p)) {
            const content = fs.readFileSync(p, 'utf8');
            const match = content.match(/GEMINI_API_KEY=([^\s]+)/);
            if (match) return match[1].replace(/"/g, '').replace(/'/g, '');
        }
    }
    return process.env.GEMINI_API_KEY;
}

async function verifyModel(modelName: string) {
    const key = getApiKey();
    if (!key) return;

    console.log(`--- TESTING MODEL: ${modelName} ---`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say "Working"' }] }]
            })
        });
        const data = await res.json();
        if (res.ok) {
            console.log(`✅ ${modelName} is working! Response: ${data.candidates?.[0]?.content?.parts?.[0]?.text}`);
        } else {
            console.log(`❌ ${modelName} failed: ${res.status} ${data.error?.message}`);
        }
    } catch (err: any) {
        console.log(`💥 Error: ${err.message}`);
    }
}

async function run() {
    await verifyModel('gemini-pro-latest');
    await verifyModel('gemini-flash-latest');
}

run();
