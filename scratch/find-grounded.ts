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

async function findGrounded() {
  const { data: itineraries } = await supabase.from('itineraries').select('content').limit(100);
  
  let groundedCount = 0;
  let totalActivities = 0;
  let sampleGrounded: any = null;

  for (const item of itineraries || []) {
    const content = item.content;
    if (content && content.days) {
      for (const day of content.days) {
        if (day.activities) {
          for (const act of day.activities) {
            totalActivities++;
            // Check for lat/lng anywhere in activity
            const jsonStr = JSON.stringify(act);
            if (jsonStr.includes('"lat":') || jsonStr.includes('"lng":')) {
              groundedCount++;
              if (!sampleGrounded) sampleGrounded = act;
            }
          }
        }
      }
    }
  }

  console.log(`Analyzed ${itineraries?.length} itineraries.`);
  console.log(`Total activities: ${totalActivities}`);
  console.log(`Grounded activities (with lat/lng): ${groundedCount}`);
  console.log(`Grounding Rate: ${((groundedCount / totalActivities) * 100).toFixed(2)}%`);
  
  if (sampleGrounded) {
    console.log("\nSample Grounded Activity Schema:");
    console.log(JSON.stringify(sampleGrounded, null, 2));
  } else {
    console.log("\nNo grounded activities found in the first 100 records.");
  }
}
findGrounded();
