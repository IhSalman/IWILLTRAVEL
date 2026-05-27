
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

async function listAllModels() {
    const key = getApiKey();
    if (!key) return;

    console.log('--- ENUMERATING ALL MODELS ---');
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (res.ok) {
            console.log('Available Models:');
            data.models?.forEach((m: any) => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
            });
            if (!data.models || data.models.length === 0) {
                console.log('No models returned for this key.');
            }
        } else {
            console.log(`❌ List failed: ${res.status} ${data.error?.message}`);
        }
    } catch (err: any) {
        console.log(`💥 Error: ${err.message}`);
    }
}

listAllModels();
