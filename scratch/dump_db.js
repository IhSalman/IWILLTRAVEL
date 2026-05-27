
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function dumpItinerary() {
    const url = 'https://gupnphrvbgkrftgwhuvf.supabase.co';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cG5waHJ2YmdrcmZ0Z3dodXZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIyNzQyMiwiZXhwIjoyMDg3ODAzNDIyfQ.J_-ou8qJkJP9OrsYV2q6hvMtKueUVT7WklkIwiHQOPA';
    const id = '308dc7f1-c122-4e55-b11c-90555d51a238';

    const supabase = createClient(url, key);
    const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    fs.writeFileSync(path.join(__dirname, 'itinerary_dump.json'), JSON.stringify(data, null, 2));
    console.log('Dumped to itinerary_dump.json');
}

dumpItinerary();
