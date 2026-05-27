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

async function extractAdvancedMetrics() {
  console.log("Extracting Advanced Thesis Metrics...");
  const { data: itineraries, error } = await supabase
    .from('itineraries')
    .select('id, title, content, budget, travel_style, traveler_type, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error:", error);
    return;
  }

  const csvRows = [
    ['Itinerary ID', 'Date', 'Title', 'Budget', 'Style', 'Type', 'Total Activities', 'Grounded Activities', 'Grounding %', 'Avg Rating', 'Has Opening Hours']
  ];

  const summary: any = {
    totalItineraries: itineraries.length,
    totalActivities: 0,
    totalGrounded: 0,
    budgets: {},
    locations: {}
  };

  for (const item of itineraries) {
    let activityCount = 0;
    let groundedCount = 0;
    let ratingsSum = 0;
    let hasOpeningHours = false;

    const content = item.content;
    if (content && content.days) {
      for (const day of content.days) {
        if (day.activities) {
          for (const act of day.activities) {
            activityCount++;
            const jsonStr = JSON.stringify(act);
            const isGrounded = jsonStr.includes('"lat":') || jsonStr.includes('"lng":') || !!act.coordinates || !!act.place;
            
            if (isGrounded) {
              groundedCount++;
              if (act.rating) ratingsSum += act.rating;
              if (act.openingHours && act.openingHours.length > 0) hasOpeningHours = true;
            }
          }
        }
      }
    }

    const groundingPercent = activityCount > 0 ? ((groundedCount / activityCount) * 100).toFixed(1) : "0.0";
    const avgRating = groundedCount > 0 ? (ratingsSum / groundedCount).toFixed(1) : "N/A";

    csvRows.push([
      item.id,
      item.created_at.split('T')[0],
      item.title || "Untitled",
      item.budget,
      item.travel_style,
      item.traveler_type,
      activityCount.toString(),
      groundedCount.toString(),
      groundingPercent,
      avgRating,
      hasOpeningHours ? 'YES' : 'NO'
    ]);

    summary.totalActivities += activityCount;
    summary.totalGrounded += groundedCount;
    summary.budgets[item.budget] = (summary.budgets[item.budget] || 0) + 1;
    
    const city = (item.title || "").replace('5-Day Relaxed Trip to ', '').replace('Itinerary for ', '');
    if (city) summary.locations[city] = (summary.locations[city] || 0) + 1;
  }

  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  fs.writeFileSync('thesis_full_itinerary_metrics.csv', csvContent);
  
  const finalReport = {
    summary: {
      ...summary,
      groundingEfficiency: ((summary.totalGrounded / summary.totalActivities) * 100).toFixed(1) + "%"
    },
    topLocations: Object.entries(summary.locations).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10)
  };

  fs.writeFileSync('thesis_advanced_summary.json', JSON.stringify(finalReport, null, 2));
  console.log("\nSuccess! Generated:");
  console.log("1. thesis_full_itinerary_metrics.csv (Raw data for tables/charts)");
  console.log("2. thesis_advanced_summary.json (Executive summary)");
}

extractAdvancedMetrics();
