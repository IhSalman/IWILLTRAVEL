
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
    if (!url || !key) {
        console.error('Missing env vars');
        return;
    }
    const supabase = createClient(url, key);
    
    const tables = ['user_subscriptions', 'user_usage', 'user_credits'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`❌ Table ${table} error:`, error.message);
        } else {
            console.log(`✅ Table ${table} exists`);
        }
    }

    const { data: rpcExists, error: rpcError } = await supabase.rpc('increment_usage', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_period: '2024-01',
        p_column: 'itineraries_generated',
        p_amount: 0
    });
    if (rpcError) {
        console.log(`❌ RPC increment_usage error:`, rpcError.message);
    } else {
        console.log(`✅ RPC increment_usage exists`);
    }
}

check();
