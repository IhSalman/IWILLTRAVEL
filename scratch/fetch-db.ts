import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = envContent.split('\n').reduce((acc: any, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1].trim()] = match[2].trim();
  return acc;
}, {});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchIt() {
  const { data, error } = await supabase.from('itineraries').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) {
      console.error(error);
      return;
  }
  fs.writeFileSync('scratch/latest_db_itineraries.json', JSON.stringify(data, null, 2));
  console.log('Saved to scratch/latest_db_itineraries.json');
}
fetchIt();
