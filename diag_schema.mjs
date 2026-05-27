import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
    console.log('Checking community_posts and profiles relationship...');
    
    // 1. Check columns in community_posts
    const { data: cols, error: colError } = await supabase.rpc('get_table_info', { t_name: 'community_posts' });
    if (colError) {
        // If RPC doesn't exist, try a direct query to get one row
        const { data: row, error: rowErr } = await supabase.from('community_posts').select('*').limit(1);
        if (rowErr) console.error('Error fetching one row:', rowErr);
        else console.log('Sample row from community_posts:', row[0] ? Object.keys(row[0]) : 'No rows');
    } else {
        console.log('Columns:', cols);
    }

    // 2. Try the problematic query
    const { data: queryData, error: queryError } = await supabase
        .from('community_posts')
        .select(`
            user_id,
            profiles ( full_name )
        `)
        .limit(1);
    
    if (queryError) {
        console.log('\nQuery failed as expected:');
        console.log(JSON.stringify(queryError, null, 2));
    } else {
        console.log('\nQuery unexpectedly succeeded:', queryData);
    }
}

checkSchema();
