const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://gupnphrvbgkrftgwhuvf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cG5waHJ2YmdrcmZ0Z3dodXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNzQyMiwiZXhwIjoyMDg3ODAzNDIyfQ.J_-ou8qJkJP9OrsYV2q6hvMtKueUVT7WklkIwiHQOPA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkItinerary(id) {
    const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching itinerary:', error);
        return;
    }

    console.log('--- ITINERARY DATA ---');
    console.log('Title:', data.content.itinerary?.title || data.content.title);
    console.log('Days:', (data.content.itinerary?.days || data.content.days)?.length);
    
    const days = data.content.itinerary?.days || data.content.days || [];
    days.forEach((day, i) => {
        console.log(`Day ${day.day || i+1}: ${day.theme}`);
        console.log(`  Activities: ${day.activities?.length || 0}`);
        day.activities?.forEach((act, j) => {
            console.log(`    ${j+1}. ${act.title || act.name}`);
            console.log(`       Desc: ${act.description ? act.description.substring(0, 50) + '...' : 'MISSING'}`);
            console.log(`       Editorial: ${act.editorialSummary ? act.editorialSummary.substring(0, 50) + '...' : 'MISSING'}`);
        });
    });
}

const id = '308dc7f1-c122-4e55-b11c-90555d51a238';
checkItinerary(id);
