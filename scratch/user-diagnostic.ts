
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

function getApiKey() {
    const envPaths = [
        path.join(process.cwd(), '.env'),
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env.development'),
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

async function listModels() {
    const key = getApiKey();
    if (!key) {
        console.error('ERROR: GEMINI_API_KEY not found in .env files or process.env');
        return;
    }

    console.log('--- DIAGNOSTIC: LISTING AVAILABLE MODELS ---');
    console.log('Using Key: ' + key.substring(0, 5) + '...' + key.slice(-4));
    
    try {
        const genAI = new GoogleGenerativeAI(key);
        const testModels = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-2.0-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro-latest',
            'gemini-pro',
            'gemini-pro-latest',      // Added working alias
            'gemini-flash-latest'      // Added working alias
        ];

        for (const m of testModels) {
            try {
                const testModel = genAI.getGenerativeModel({ model: m });
                const result = await testModel.generateContent("hi");
                console.log(`✅ [${m}] is AVAILABLE`);
            } catch (err: any) {
                if (err.message.includes('404')) {
                    console.log(`❌ [${m}] NOT FOUND (404)`);
                } else if (err.message.includes('403')) {
                    console.log(`🚫 [${m}] PERMISSION DENIED (403)`);
                } else if (err.message.includes('429')) {
                    console.log(`⏳ [${m}] RATE LIMITED (429)`);
                } else {
                    console.log(`❓ [${m}] ERROR: ${err.message.substring(0, 100)}`);
                }
            }
        }
    } catch (globalErr: any) {
        console.error('Global Diagnostic Error:', globalErr.message);
    }
}

listModels();
