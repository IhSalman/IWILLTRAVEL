
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env parsing since dotenv is missing
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim();
});

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['SUPABASE_SERVICE_ROLE_KEY'];

async function check() {
    if (!url || !key) {
        console.error('Missing env vars');
        return;
    }
    const supabase = createClient(url, key);
    
    console.log('--- Checking Tables ---');
    const tables = ['user_subscriptions', 'user_usage', 'user_credits', 'profiles', 'translation_history'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table ${table}: ${error.message}`);
        } else {
            console.log(`✅ Table ${table} exists`);
        }
    }

    console.log('\n--- Checking RPC ---');
    try {
        const { error: rpcError } = await supabase.rpc('increment_usage', {
            p_user_id: '00000000-0000-0000-0000-000000000000',
            p_period: '2024-01',
            p_column: 'itineraries_generated',
            p_amount: 0
        });
        if (rpcError && rpcError.message.includes('does not exist')) {
            console.log(`❌ RPC increment_usage: Missing`);
        } else if (rpcError) {
             console.log(`✅ RPC increment_usage likely exists (Error: ${rpcError.message})`);
        } else {
            console.log(`✅ RPC increment_usage exists`);
        }
    } catch (e) {
        console.log(`❌ RPC increment_usage check failed:`, e.message);
    }
}

check();
